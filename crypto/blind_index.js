import crypto from 'crypto';
import { getBlindIndexKey } from './key_manager.js';

/**
 * Computes an HMAC-SHA256 blind index for fast exact-match searches over encrypted fields.
 * Input is normalized (trimmed and lowercased) prior to hashing.
 * 
 * @param {string} value Plaintext value to index (e.g. phone or email)
 * @param {Buffer} [customKey] Optional HMAC key; defaults to derived blind index key
 * @returns {string} 64-character hex string
 */
export function generateBlindIndex(value, customKey = null) {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).trim().toLowerCase();
  const key = customKey || getBlindIndexKey();

  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}
