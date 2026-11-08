import { query } from '../backend/src/database/connection.js';
import { logger } from '../backend/src/utils/logger.js';

/**
 * Sanitizes object payload so secrets are never written to database logs
 */
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const copy = { ...payload };
  const sensitiveKeys = [
    'password',
    'password_hash',
    'secret',
    'vigenereKey',
    'encryptionKey',
    'sharedSecret',
    'sessionToken',
    'faceCaptureBase64'
  ];

  for (const key of sensitiveKeys) {
    if (key in copy) {
      copy[key] = '[REDACTED]';
    }
  }

  return copy;
}

/**
 * Records an operational activity log.
 */
export async function logActivity({ userId, action, entityType, entityId = null, details = null, ipAddress = '127.0.0.1' }) {
  try {
    const detailString = typeof details === 'object' ? JSON.stringify(sanitizePayload(details)) : details;
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [userId || null, action, entityType, entityId ? String(entityId) : null, detailString, ipAddress]
    );
  } catch (err) {
    logger.error('Failed to log activity:', { action, error: err.message });
  }
}

/**
 * Records a security incident event.
 */
export async function logSecurityEvent({ eventType, severity = 'MEDIUM', description, sourceIp = '127.0.0.1', payload = null }) {
  try {
    const payloadString = payload ? JSON.stringify(sanitizePayload(payload)) : null;
    await query(
      `INSERT INTO security_events (event_type, severity, description, source_ip, payload_snapshot)
       VALUES (?, ?, ?, ?, ?);`,
      [eventType, severity, description, sourceIp, payloadString]
    );
    logger.warn(`[SECURITY EVENT: ${severity}] ${eventType} - ${description}`);
  } catch (err) {
    logger.error('Failed to log security event:', { eventType, error: err.message });
  }
}
