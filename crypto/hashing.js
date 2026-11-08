import argon2 from 'argon2';
import crypto from 'crypto';

/**
 * Standard OWASP Recommended Argon2id parameters
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB (in KiB)
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 parallel threads
  saltLength: 16,    // 16 bytes CSPRNG salt
  hashLength: 32     // 32 bytes derived key/hash length
};

/**
 * Hashes a plaintext password using Argon2id with unique cryptographic salt.
 * 
 * @param {string} password 
 * @returns {Promise<string>} Standard Argon2id PHC string
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 * 
 * @param {string} hash PHC format hash string
 * @param {string} password Plaintext password to verify
 * @returns {Promise<boolean>} True if matching, false otherwise
 */
export async function verifyPassword(hash, password) {
  if (!hash || !password) return false;
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a cryptographically secure SHA-256 hash.
 * 
 * @param {string|Buffer} data 
 * @returns {string} 64-character lowercase hex string
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes an HMAC-SHA256 signature.
 * 
 * @param {string|Buffer} data 
 * @param {string|Buffer} secretKey 
 * @returns {string} 64-character hex signature
 */
export function hmacSha256(data, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

/**
 * Generates cryptographically secure random bytes as hex string.
 * 
 * @param {number} length Number of bytes
 * @returns {string} Hex string
 */
export function generateRandomHex(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a UUID v4 string.
 */
export function generateUUID() {
  return crypto.randomUUID();
}
