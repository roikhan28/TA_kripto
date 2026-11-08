import crypto from 'crypto';
import { query } from '../backend/src/database/connection.js';
import { encryptAESGCM, decryptAESGCM } from '../crypto/aes.js';
import { getDatabaseKey } from '../crypto/key_manager.js';
import { hmacSha256 } from '../crypto/hashing.js';
import { logger } from '../backend/src/utils/logger.js';
import { logSecurityEvent } from './audit_logger.js';

// Cache of pending active challenges: challengeToken -> { userId, deviceHardwareId, nonce, expiresAt }
const pendingChallenges = new Map();

/**
 * Registers a USB Security Dongle bound to a user.
 * 
 * @param {number} userId 
 * @param {string} deviceHardwareId 
 * @param {string} vendorId 
 * @param {string} productId 
 * @param {string} sharedSecret 
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function registerDongle({ userId, deviceHardwareId, vendorId, productId, sharedSecret }) {
  if (!deviceHardwareId || !sharedSecret) {
    throw new Error('Device Hardware ID and Shared Secret are required');
  }

  // Encrypt the shared secret before saving to MySQL
  const key = getDatabaseKey();
  const encrypted = encryptAESGCM(sharedSecret, key, `dongle_${deviceHardwareId}`);

  await query(
    `INSERT INTO dongles 
      (user_id, device_hardware_id, vendor_id, product_id, shared_secret_encrypted, is_revoked, registered_at)
     VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP);`,
    [userId, deviceHardwareId, vendorId || '0000', productId || '0000', encrypted.envelope]
  );

  logger.info(`Registered USB Security Dongle for user: ${userId} [Device: ${deviceHardwareId}]`);
  return { success: true, message: 'USB Security Dongle berhasil didaftarkan' };
}

/**
 * Generates a cryptographically random challenge for a registered dongle.
 * 
 * @param {number} userId 
 * @param {string} deviceHardwareId 
 * @returns {Promise<{ challenge: string, expiresAt: number }>}
 */
export async function createDongleChallenge(userId, deviceHardwareId) {
  // Check if device is active and not revoked
  const rows = await query(
    `SELECT id, is_revoked FROM dongles 
     WHERE user_id = ? AND device_hardware_id = ? AND is_revoked = 0;`,
    [userId, deviceHardwareId]
  );

  if (!rows || rows.length === 0) {
    throw new Error('Perangkat USB tidak terdaftar atau telah dicabut hak aksesnya');
  }

  const nonce = crypto.randomBytes(32).toString('hex');
  const challengeToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 60000; // 60 seconds TTL

  pendingChallenges.set(challengeToken, {
    userId,
    deviceHardwareId,
    nonce,
    expiresAt
  });

  return {
    challengeToken,
    nonce,
    expiresAt
  };
}

/**
 * Verifies a challenge response from the USB dongle.
 * 
 * @param {string} challengeToken 
 * @param {string} responseHmac Expected HMAC-SHA256(nonce, sharedSecret)
 * @returns {Promise<{ success: boolean, verified: boolean }>}
 */
export async function verifyDongleResponse(challengeToken, responseHmac) {
  const challenge = pendingChallenges.get(challengeToken);
  if (!challenge) {
    throw new Error('Challenge token tidak valid atau telah kedaluwarsa');
  }

  if (Date.now() > challenge.expiresAt) {
    pendingChallenges.delete(challengeToken);
    throw new Error('Challenge token telah melewati batas waktu (expired)');
  }

  // Retrieve encrypted shared secret from DB
  const rows = await query(
    `SELECT shared_secret_encrypted, is_revoked FROM dongles 
     WHERE user_id = ? AND device_hardware_id = ?;`,
    [challenge.userId, challenge.deviceHardwareId]
  );

  pendingChallenges.delete(challengeToken);

  if (!rows || rows.length === 0 || rows[0].is_revoked) {
    throw new Error('Perangkat tidak ditemukan atau telah dicabut');
  }

  const key = getDatabaseKey();
  const sharedSecret = decryptAESGCM(rows[0].shared_secret_encrypted, key, `dongle_${challenge.deviceHardwareId}`);

  // Compute expected HMAC
  const expectedHmac = hmacSha256(challenge.nonce, sharedSecret);

  // Constant-time comparison to prevent timing attacks
  const bufExpected = Buffer.from(expectedHmac, 'hex');
  const bufResponse = Buffer.from(responseHmac, 'hex');

  let verified = false;
  if (bufExpected.length === bufResponse.length) {
    verified = crypto.timingSafeEqual(bufExpected, bufResponse);
  }

  if (verified) {
    await query(
      `UPDATE dongles SET last_used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND device_hardware_id = ?;`,
      [challenge.userId, challenge.deviceHardwareId]
    );
    logger.info(`USB Dongle Challenge-Response VERIFIED for userId: ${challenge.userId}`);
  } else {
    await logSecurityEvent({
      eventType: 'DONGLE_AUTH_FAILED',
      severity: 'HIGH',
      description: `USB Dongle signature mismatch for userId ${challenge.userId}`,
      payload: { userId: challenge.userId, deviceHardwareId: challenge.deviceHardwareId }
    });
  }

  return { success: true, verified };
}

/**
 * Revokes a registered dongle.
 */
export async function revokeDongle(userId, deviceHardwareId) {
  await query(
    `UPDATE dongles SET is_revoked = 1 WHERE user_id = ? AND device_hardware_id = ?;`,
    [userId, deviceHardwareId]
  );
  logger.info(`Revoked USB Dongle for user: ${userId} [Device: ${deviceHardwareId}]`);
  return { success: true, message: 'Hak akses perangkat USB berhasil dicabut' };
}
