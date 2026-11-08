import { config } from '../backend/src/config/environment.js';
import { testConnection, query } from '../backend/src/database/connection.js';
import { logger } from '../backend/src/utils/logger.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import { z } from 'zod';
import { createValidatedHandler } from '../electron/security/ipc_validation.js';

async function runFoundationTests() {
  console.log('====================================================');
  console.log('   GYMVAULT V2.0 - PHASE 1 FOUNDATION TEST SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[\x1b[32mPASS\x1b[0m] ${testName}`);
      passed++;
    } else {
      console.error(`[\x1b[31mFAIL\x1b[0m] ${testName}`);
      failed++;
    }
  }

  // 1. Test Environment Config
  console.log('--- 1. Testing Configuration & Paths ---');
  assert(config.db.database === 'gymvault', 'Database name configured as gymvault');
  assert(config.crypto.keyVersion === 1, 'Master crypto key version is 1');

  // 2. Test MySQL Connection & Tables
  console.log('\n--- 2. Testing Database Connection & Schema ---');
  const dbHealth = await testConnection();
  assert(dbHealth.ok === true, 'MySQL connection established on port 3306');

  const tables = await query('SHOW TABLES FROM gymvault;');
  assert(tables.length === 22, `All 22 core tables present in schema (found: ${tables.length})`);

  const [adminUser] = await query('SELECT * FROM users WHERE username = ?;', ['admin']);
  assert(adminUser && adminUser.username === 'admin', 'Default admin seed user exists');

  // 3. Test Argon2id Password Hashing & Verification
  console.log('\n--- 3. Testing Argon2id Implementation ---');
  const password = 'Admin123!';
  const isValid = await argon2.verify(adminUser.password_hash, password);
  assert(isValid === true, 'Argon2id password verification succeeds for Admin123!');

  const isInvalid = await argon2.verify(adminUser.password_hash, 'WrongPassword!');
  assert(isInvalid === false, 'Argon2id rejects incorrect password securely');

  // 4. Test Crypto Primitives (Node.js native)
  console.log('\n--- 4. Testing Core Cryptography Primitives ---');
  // AES-256-GCM
  const testKey = crypto.randomBytes(32);
  const testIv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', testKey, testIv);
  let enc = cipher.update('GYMVAULT_CONFIDENTIAL_PII', 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag();

  const decipher = crypto.createDecipheriv('aes-256-gcm', testKey, testIv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  assert(dec === 'GYMVAULT_CONFIDENTIAL_PII', 'AES-256-GCM roundtrip encryption/decryption works');

  // ChaCha20-Poly1305
  const chachaKey = crypto.randomBytes(32);
  const chachaNonce = crypto.randomBytes(12);
  const chachaCipher = crypto.createCipheriv('chacha20-poly1305', chachaKey, chachaNonce, { authTagLength: 16 });
  let chachaEnc = chachaCipher.update('GYMVAULT_FILE_STREAM_DATA', 'utf8', 'hex');
  chachaEnc += chachaCipher.final('hex');
  const chachaTag = chachaCipher.getAuthTag();

  const chachaDecipher = crypto.createDecipheriv('chacha20-poly1305', chachaKey, chachaNonce, { authTagLength: 16 });
  chachaDecipher.setAuthTag(chachaTag);
  let chachaDec = chachaDecipher.update(chachaEnc, 'hex', 'utf8');
  chachaDec += chachaDecipher.final('utf8');
  assert(chachaDec === 'GYMVAULT_FILE_STREAM_DATA', 'ChaCha20-Poly1305 roundtrip encryption/decryption works');

  // 5. Test IPC Validation & Error Envelope
  console.log('\n--- 5. Testing IPC Security & Zod Validation ---');
  const testSchema = z.object({
    username: z.string().min(3),
    roleId: z.number().int().positive()
  });

  const testHandler = createValidatedHandler('test:channel', testSchema, async (payload) => {
    return { greeting: `Hello ${payload.username}` };
  });

  // Valid invocation
  const validRes = await testHandler(null, {
    channel: 'test:channel',
    payload: { username: 'john_doe', roleId: 2 },
    requestId: 'req_123'
  });
  assert(validRes.success === true && validRes.data.greeting === 'Hello john_doe', 'IPC Validator passes valid payload');

  // Invalid invocation
  const invalidRes = await testHandler(null, {
    channel: 'test:channel',
    payload: { username: 'x', roleId: -1 },
    requestId: 'req_124'
  });
  assert(invalidRes.success === false && invalidRes.error.code === 'VALIDATION_ERROR', 'IPC Validator blocks invalid payload with VALIDATION_ERROR');

  // 6. Test Blockchain Genesis Block
  console.log('\n--- 6. Testing Blockchain Genesis Verification ---');
  const [genesis] = await query('SELECT * FROM blockchain WHERE block_index = 0;');
  assert(genesis && genesis.asset_id === 'GENESIS', 'Genesis block correctly recorded in blockchain table');
  assert(genesis.previous_hash === '0'.repeat(64), 'Genesis block previous hash is 64 zeros');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runFoundationTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
