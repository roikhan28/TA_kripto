import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, verifyPassword, generateUUID } from '../../../crypto/hashing.js';
import { sessionManager } from '../../../security/session_manager.js';
import { logActivity, logSecurityEvent } from '../../../security/audit_logger.js';
import { logger } from '../utils/logger.js';
import { transaction } from '../database/connection.js';
import { encryptAESGCM } from '../../../crypto/aes.js';
import { getDatabaseKey } from '../../../crypto/key_manager.js';
import { generateBlindIndex } from '../../../crypto/blind_index.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authService = {
  /**
   * Authenticates a user using username and password.
   * Enforces Argon2id verification, failed attempt throttling, and temporary lockout.
   */
  async login({ username, password, ipAddress = '127.0.0.1' }) {
    if (!username || !password) {
      throw new Error('Username dan password wajib diisi');
    }

    const user = await userRepository.findByUsername(username);

    // Timing attack mitigation: if user does not exist, run dummy verification
    if (!user) {
      // Dummy hash for uniform time consumption
      await verifyPassword('$argon2id$v=19$m=65536,t=3,p=4$dummySalt123456789$dummyHash123456789012345678901234567890', password);
      await logSecurityEvent({
        eventType: 'LOGIN_FAILED_UNKNOWN_USER',
        severity: 'LOW',
        description: `Failed login attempt for unknown user: ${username}`,
        sourceIp: ipAddress
      });
      throw new Error('Kredensial login tidak valid');
    }

    // 1. Check account active status
    if (!user.is_active) {
      throw new Error('Akun Anda dinonaktifkan. Hubungi administrator.');
    }

    // 2. Check account lockout status
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      const now = Date.now();
      if (now < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - now) / 60000);
        await logSecurityEvent({
          eventType: 'LOCKED_ACCOUNT_LOGIN_ATTEMPT',
          severity: 'MEDIUM',
          description: `Login attempt on locked account: ${username}`,
          sourceIp: ipAddress,
          payload: { userId: user.id, username, remainingMinutes }
        });
        throw new Error(`Akun terkunci sementara karena terlalu banyak percobaan salah. Silakan coba ${remainingMinutes} menit lagi.`);
      } else {
        // Lock expired: reset
        await userRepository.resetFailedAttempts(user.id);
      }
    }

    // 3. Verify Argon2id password hash
    const passwordValid = await verifyPassword(user.password_hash, password);

    if (!passwordValid) {
      const currentFailures = await userRepository.incrementFailedAttempts(user.id);
      logger.warn(`Failed login attempt for user: ${username} (Attempt ${currentFailures}/${MAX_FAILED_ATTEMPTS})`);

      if (currentFailures >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await userRepository.lockAccount(user.id, lockedUntil);

        await logSecurityEvent({
          eventType: 'ACCOUNT_LOCKED_BRUTE_FORCE',
          severity: 'HIGH',
          description: `User ${username} exceeded ${MAX_FAILED_ATTEMPTS} failed attempts. Account locked for 15 minutes.`,
          sourceIp: ipAddress,
          payload: { userId: user.id, username, lockedUntil }
        });

        throw new Error(`Akun telah dikunci selama 15 menit karena ${MAX_FAILED_ATTEMPTS} kali percobaan salah berturut-turut.`);
      }

      await logSecurityEvent({
        eventType: 'LOGIN_FAILED_PASSWORD_MISMATCH',
        severity: 'LOW',
        description: `Password mismatch for user ${username}`,
        sourceIp: ipAddress,
        payload: { userId: user.id, username, attempt: currentFailures }
      });

      const remainingAttempts = MAX_FAILED_ATTEMPTS - currentFailures;
      throw new Error(`Password salah. Sisa kesempatan: ${remainingAttempts} kali.`);
    }

    // 4. Success: reset failed attempts & update login timestamp
    await userRepository.recordLoginSuccess(user.id);

    // 5. Load user permissions
    const permissions = await userRepository.getUserPermissions(user.id);

    // 6. Create active in-memory session
    const session = sessionManager.createSession(user, permissions);

    // 7. Audit log
    await logActivity({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      details: { username: user.username, role: user.role_name },
      ipAddress
    });

    return session;
  },

  /**
   * Registers a new user account (e.g. member or trainer).
   */
  async register({ username, password, roleName = 'MEMBER', fullName, email, phone }) {
    if (!username || !password || !fullName) {
      throw new Error('Data registrasi tidak lengkap');
    }

    // Check username availability
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      throw new Error('Username sudah digunakan, pilih username lain');
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);
    const userUuid = generateUUID();

    // Map role ID
    let roleId = 3; // Default MEMBER
    if (roleName === 'TRAINER') roleId = 2;
    if (roleName === 'ADMIN') roleId = 1;

    // Use transaction to create user and profile atomically
    const result = await transaction(async (conn) => {
      // 1. Insert user
      const [uRes] = await conn.execute(
        `INSERT INTO users (uuid, username, password_hash, role_id, is_active)
         VALUES (?, ?, ?, ?, 1);`,
        [userUuid, username, passwordHash, roleId]
      );
      const newUserId = uRes.insertId;

      // 2. Insert profile if MEMBER
      if (roleId === 3) {
        const memberUuid = generateUUID();
        const memberCode = 'MBR-' + String(newUserId).padStart(4, '0');
        const dbKey = getDatabaseKey();

        const encEmail = email ? encryptAESGCM(email, dbKey, `member_email_${newUserId}`).envelope : '';
        const biEmail = email ? generateBlindIndex(email) : '';

        const encPhone = phone ? encryptAESGCM(phone, dbKey, `member_phone_${newUserId}`).envelope : '';
        const biPhone = phone ? generateBlindIndex(phone) : '';

        await conn.execute(
          `INSERT INTO members (uuid, user_id, member_code, full_name, email_encrypted, email_blind_index, phone_encrypted, phone_blind_index, join_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE());`,
          [memberUuid, newUserId, memberCode, fullName, encEmail, biEmail, encPhone, biPhone]
        );
      }

      return { userId: newUserId, username, roleName };
    });

    logger.info(`New user registered successfully: ${username} [Role: ${roleName}]`);
    return result;
  },

  /**
   * Destroys active session
   */
  async logout(sessionToken) {
    return sessionManager.destroySession(sessionToken);
  },

  /**
   * Validates active session token
   */
  async checkSession(sessionToken) {
    const session = sessionManager.validateSession(sessionToken);
    if (!session) return { valid: false };

    return {
      valid: true,
      user: {
        id: session.userId,
        uuid: session.uuid,
        username: session.username,
        roleId: session.roleId,
        roleName: session.roleName,
        permissions: Array.from(session.permissions)
      },
      expiresAt: new Date(session.expiresAt).toISOString()
    };
  }
};
