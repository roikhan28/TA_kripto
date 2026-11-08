import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../backend/src/config/environment.js';
import { logger } from '../backend/src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');
const MASTER_KEY_FILE = path.join(rootDir, '.vault_master');

let masterEncryptionKey = null;

/**
 * Initializes or loads the Master Encryption Key (MEK)
 */
export function getMasterKey() {
  if (masterEncryptionKey) {
    return masterEncryptionKey;
  }

  try {
    if (fs.existsSync(MASTER_KEY_FILE)) {
      const raw = fs.readFileSync(MASTER_KEY_FILE);
      if (raw.length === 32) {
        masterEncryptionKey = raw;
        return masterEncryptionKey;
      }
    }

    // Generate new 256-bit cryptographically secure MEK
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(MASTER_KEY_FILE, newKey, { mode: 0o600 });
    masterEncryptionKey = newKey;
    logger.info('Generated and stored new 256-bit Master Encryption Key (MEK).');
    return masterEncryptionKey;
  } catch (err) {
    logger.error('Failed to load or generate Master Encryption Key:', err);
    // Fallback deterministic derivation from config salt for resilience
    masterEncryptionKey = crypto.scryptSync(config.crypto.masterSalt, 'gymvault-mek-salt', 32);
    return masterEncryptionKey;
  }
}

/**
 * Derives a domain-specific Data Encryption Key (DEK) using HKDF (RFC 5869)
 * 
 * @param {string} contextInfo Context label (e.g. 'gymvault-db-aes', 'gymvault-biometric-aes')
 * @param {number} keyLength Length of derived key in bytes (default 32 for 256-bit)
 * @returns {Buffer} Derived 256-bit key buffer
 */
export function deriveKey(contextInfo, keyLength = 32) {
  const mek = getMasterKey();
  const salt = Buffer.from(config.crypto.masterSalt, 'hex');
  const info = Buffer.from(contextInfo, 'utf8');

  const derived = crypto.hkdfSync('sha256', mek, salt, info, keyLength);
  return Buffer.from(derived);
}

// Pre-configured domain key getters
export const getDatabaseKey = () => deriveKey('gymvault-db-aes-dek');
export const getBiometricKey = () => deriveKey('gymvault-biometric-aes-dek');
export const getFileKey = () => deriveKey('gymvault-file-chacha-dek');
export const getMessagingKey = () => deriveKey('gymvault-messaging-aes-dek');
export const getBlindIndexKey = () => deriveKey('gymvault-blind-index-hmac');
