import crypto from 'crypto';

/**
 * Encrypts plaintext string using AES-256-GCM.
 * 
 * @param {string|Buffer} plaintext 
 * @param {Buffer} key 256-bit key buffer
 * @param {string} [aad=''] Optional Additional Authenticated Data
 * @returns {{ iv: string, ciphertext: string, authTag: string, envelope: string }}
 */
export function encryptAESGCM(plaintext, key, aad = '') {
  const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
  if (!keyBuf || keyBuf.length !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte (256-bit) key');
  }

  const iv = crypto.randomBytes(12); // 96-bit unique nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  const inputBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
  let ciphertext = cipher.update(inputBuffer);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivB64 = iv.toString('base64');
  const ctB64 = ciphertext.toString('base64');
  const tagB64 = authTag.toString('base64');

  return {
    iv: ivB64,
    ciphertext: ctB64,
    authTag: tagB64,
    envelope: `enc:v1:${ivB64}:${ctB64}:${tagB64}`
  };
}

/**
 * Decrypts AES-256-GCM ciphertext payload.
 * Verifies the 128-bit authentication tag before returning plaintext.
 * 
 * @param {string|{ iv: string, ciphertext: string, authTag: string }} input Envelope string or object
 * @param {Buffer} key 256-bit key buffer
 * @param {string} [aad=''] Expected Additional Authenticated Data
 * @returns {string} Decrypted plaintext string
 */
export function decryptAESGCM(input, key, aad = '') {
  const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
  if (!keyBuf || keyBuf.length !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte (256-bit) key');
  }

  let ivB64, ctB64, tagB64;

  if (typeof input === 'string') {
    // Format: enc:v1:<iv>:<ciphertext>:<tag>
    const parts = input.split(':');
    if (parts.length === 5 && parts[0] === 'enc' && parts[1] === 'v1') {
      ivB64 = parts[2];
      ctB64 = parts[3];
      tagB64 = parts[4];
    } else {
      throw new Error('Invalid AES-256-GCM envelope string format');
    }
  } else if (input && typeof input === 'object') {
    ivB64 = input.iv;
    ctB64 = input.ciphertext;
    tagB64 = input.authTag;
  } else {
    throw new Error('Invalid input parameter for AES-256-GCM decryption');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  if (iv.length !== 12) {
    throw new Error('Invalid IV length for AES-256-GCM: must be 12 bytes');
  }
  if (authTag.length !== 16) {
    throw new Error('Invalid Auth Tag length for AES-256-GCM: must be 16 bytes');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

  if (aad) {
    decipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('AES-256-GCM Decryption failed: Authentication tag mismatch or corrupt ciphertext');
  }
}
