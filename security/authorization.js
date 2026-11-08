import { sessionManager } from './session_manager.js';
import { logger } from '../backend/src/utils/logger.js';
import { query } from '../backend/src/database/connection.js';

/**
 * Evaluates whether an active session possesses a required permission.
 * ADMIN role automatically possesses all permissions.
 * 
 * @param {string} sessionToken 
 * @param {string} requiredPermission 
 * @returns {Promise<{ authorized: boolean, user?: object, error?: string }>}
 */
export async function authorize(sessionToken, requiredPermission) {
  if (!sessionToken) {
    return {
      authorized: false,
      error: 'AUTH_UNAUTHENTICATED'
    };
  }

  const session = sessionManager.validateSession(sessionToken);
  if (!session) {
    return {
      authorized: false,
      error: 'AUTH_SESSION_EXPIRED'
    };
  }

  // Superuser ADMIN bypass
  if (session.roleName === 'ADMIN') {
    return {
      authorized: true,
      user: {
        id: session.userId,
        uuid: session.uuid,
        username: session.username,
        roleName: session.roleName,
        roleId: session.roleId
      }
    };
  }

  // Check specific permission
  if (session.permissions.has(requiredPermission)) {
    return {
      authorized: true,
      user: {
        id: session.userId,
        uuid: session.uuid,
        username: session.username,
        roleName: session.roleName,
        roleId: session.roleId
      }
    };
  }

  // Log unauthorized access attempt for audit
  logger.warn(`Access Denied [RBAC]: User ${session.username} attempted action requiring '${requiredPermission}'`);
  try {
    await query(
      `INSERT INTO security_events (event_type, severity, description, payload_snapshot)
       VALUES (?, ?, ?, ?);`,
      [
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'MEDIUM',
        `User ${session.username} attempted prohibited permission: ${requiredPermission}`,
        JSON.stringify({ userId: session.userId, role: session.roleName, requiredPermission })
      ]
    );
  } catch (logErr) {
    logger.error('Failed to write security event log:', logErr);
  }

  return {
    authorized: false,
    error: 'AUTH_FORBIDDEN'
  };
}
