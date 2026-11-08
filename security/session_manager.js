import crypto from 'crypto';
import { logger } from '../backend/src/utils/logger.js';

// Default session timeout: 30 minutes (in milliseconds)
const SESSION_TTL_MS = 30 * 60 * 1000;

class SessionManager {
  constructor() {
    this.sessions = new Map(); // token -> sessionData
    // Periodically clean expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Creates a new authenticated session for a user.
   * 
   * @param {object} user User record from database
   * @param {string[]} permissions Array of permission code strings
   * @returns {object} { sessionToken, expiresAt, user }
   */
  createSession(user, permissions = []) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;

    const sessionData = {
      token,
      userId: user.id,
      uuid: user.uuid,
      username: user.username,
      roleId: user.role_id,
      roleName: user.role_name || 'MEMBER',
      permissions: new Set(permissions),
      createdAt: now,
      lastActiveAt: now,
      expiresAt
    };

    this.sessions.set(token, sessionData);
    logger.info(`Session created for user: ${user.username} [Role: ${sessionData.roleName}]`);

    return {
      sessionToken: token,
      expiresAt: new Date(expiresAt).toISOString(),
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        roleId: user.role_id,
        roleName: sessionData.roleName,
        permissions: Array.from(sessionData.permissions)
      }
    };
  }

  /**
   * Validates and extends a session token.
   * 
   * @param {string} token 
   * @returns {object|null} Session data or null if invalid/expired
   */
  validateSession(token) {
    if (!token || typeof token !== 'string') return null;

    const session = this.sessions.get(token);
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.sessions.delete(token);
      logger.info(`Session expired and evicted for user: ${session.username}`);
      return null;
    }

    // Slide window: update last activity and extend expiration
    session.lastActiveAt = now;
    session.expiresAt = now + SESSION_TTL_MS;

    return session;
  }

  /**
   * Destroys an active session (logout).
   */
  destroySession(token) {
    if (!token) return false;
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      logger.info(`Session destroyed for user: ${session.username}`);
      return true;
    }
    return false;
  }

  /**
   * Revokes all active sessions for a given user ID (e.g. after password change or lock).
   */
  revokeUserSessions(userId) {
    let count = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
        count++;
      }
    }
    if (count > 0) {
      logger.info(`Revoked ${count} active sessions for userId: ${userId}`);
    }
    return count;
  }

  /**
   * Sweeps expired sessions from memory.
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let evicted = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        evicted++;
      }
    }
    if (evicted > 0) {
      logger.debug(`Evicted ${evicted} expired sessions from memory.`);
    }
  }

  /**
   * Retrieves active session count.
   */
  getActiveSessionCount() {
    return this.sessions.size;
  }
}

export const sessionManager = new SessionManager();
