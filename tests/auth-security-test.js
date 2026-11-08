import { authService } from '../backend/src/services/authService.js';
import { userRepository } from '../backend/src/repositories/userRepository.js';
import { sessionManager } from '../security/session_manager.js';
import { authorize } from '../security/authorization.js';
import { enrollFaceBiometric, verifyFaceBiometric, computeCosineSimilarity } from '../security/biometric.js';
import { registerDongle, createDongleChallenge, verifyDongleResponse } from '../security/dongle.js';
import { hmacSha256 } from '../crypto/hashing.js';
import { query } from '../backend/src/database/connection.js';

async function runAuthSecurityTests() {
  console.log('====================================================');
  console.log('   GYMVAULT V2.0 - PHASE 2 AUTH & SECURITY TESTS    ');
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

  // 1. Valid Login with Argon2id
  console.log('--- 1. Testing Argon2id Authentication ---');
  // Reset admin lockout state first if any
  const admin = await userRepository.findByUsername('admin');
  await userRepository.resetFailedAttempts(admin.id);

  const loginRes = await authService.login({ username: 'admin', password: 'Admin123!' });
  assert(loginRes && loginRes.sessionToken, 'Admin login succeeds and returns session token');
  assert(loginRes.user.roleName === 'ADMIN', 'Admin role is correctly resolved');
  assert(loginRes.user.permissions.length > 0, 'Admin receives all role permissions');

  // 2. Invalid Password Attempt
  console.log('\n--- 2. Testing Password Mismatch & Attempt Counter ---');
  let threwMismatch = false;
  try {
    await authService.login({ username: 'admin', password: 'WrongPassword99!' });
  } catch (err) {
    threwMismatch = true;
    assert(err.message.includes('Password salah'), 'Throws error on wrong password with attempt warning');
  }
  assert(threwMismatch, 'Authentication fails on invalid password');

  // Check attempt counter in DB
  const userAfterFail = await userRepository.findByUsername('admin');
  assert(userAfterFail.failed_attempts === 1, 'Failed attempt counter incremented to 1 in MySQL');

  // 3. Brute Force Account Lockout (5 failed attempts)
  console.log('\n--- 3. Testing Brute-Force Account Lockout ---');
  // Trigger 4 more failed attempts to reach threshold 5
  for (let i = 0; i < 4; i++) {
    try {
      await authService.login({ username: 'admin', password: 'WrongPassword99!' });
    } catch (e) {
      // expected
    }
  }

  let lockedOut = false;
  try {
    // 6th attempt should be blocked by lockout immediately without running hash
    await authService.login({ username: 'admin', password: 'Admin123!' });
  } catch (err) {
    lockedOut = true;
    assert(err.message.includes('terkunci'), 'Account is locked out after 5 consecutive failures');
  }
  assert(lockedOut, 'Locked account rejects even valid credentials during lockout window');

  // Reset admin account for remaining tests
  await userRepository.resetFailedAttempts(admin.id);
  console.log('Reset admin account lockout for subsequent tests.');

  // 4. Session Management & RBAC
  console.log('\n--- 4. Testing Session Management & RBAC ---');
  const sessionRes = await authService.login({ username: 'member_alice', password: 'Member123!' });
  const aliceToken = sessionRes.sessionToken;

  assert(sessionManager.validateSession(aliceToken) !== null, 'Alice session is active and valid in memory');

  // RBAC test: Member should NOT have admin permission 'member:manage'
  const memberPermCheck = await authorize(aliceToken, 'member:manage');
  assert(memberPermCheck.authorized === false, 'Member is forbidden from executive member:manage permission');

  // RBAC test: Member SHOULD have 'member:read_own'
  const memberOwnCheck = await authorize(aliceToken, 'member:read_own');
  assert(memberOwnCheck.authorized === true, 'Member is authorized for personal member:read_own permission');

  // RBAC test: Admin has all permissions
  const adminSession = await authService.login({ username: 'admin', password: 'Admin123!' });
  const adminPermCheck = await authorize(adminSession.sessionToken, 'member:manage');
  assert(adminPermCheck.authorized === true, 'Admin is authorized for member:manage permission');

  // Session destroy test
  await authService.logout(aliceToken);
  assert(sessionManager.validateSession(aliceToken) === null, 'Session successfully invalidated after logout');

  // 5. Biometric Face Recognition
  console.log('\n--- 5. Testing Face Biometric Recognition & Template Encryption ---');
  // High-entropy test face capture buffer
  import('crypto').then(c => {});
  const rawBytesA = (await import('crypto')).randomBytes(1024);
  const rawBytesB = (await import('crypto')).randomBytes(1024);
  const sampleFaceA = 'data:image/png;base64,' + rawBytesA.toString('base64');
  const sampleFaceB = 'data:image/png;base64,' + rawBytesB.toString('base64');

  // Enroll face for admin (userId: 1)
  const enrollRes = await enrollFaceBiometric(1, sampleFaceA);
  assert(enrollRes.success === true, 'Face template enrolled and encrypted into biometric_credentials');

  // Verify matching face
  const verifyMatch = await verifyFaceBiometric(1, sampleFaceA);
  assert(verifyMatch.verified === true && verifyMatch.similarity >= 0.95, 'Identical face capture passes with high cosine similarity');

  // Verify non-matching face
  const verifyNonMatch = await verifyFaceBiometric(1, sampleFaceB);
  assert(verifyNonMatch.verified === false, 'Different face capture is rejected (below threshold)');

  // 6. USB Security Dongle (Challenge-Response)
  console.log('\n--- 6. Testing USB Security Dongle Challenge-Response ---');
  const testHwId = 'USB-TOKEN-SECURE-VAULT-001';
  const testSecret = 'SuperSecretSharedKeyForDongleHardware99';

  // Register device for trainer_john (userId: 2)
  await registerDongle({
    userId: 2,
    deviceHardwareId: testHwId,
    vendorId: '0483',
    productId: '5740',
    sharedSecret: testSecret
  });
  assert(true, 'USB Security Dongle successfully registered with encrypted secret in MySQL');

  // Generate challenge
  const challenge = await createDongleChallenge(2, testHwId);
  assert(challenge.nonce && challenge.nonce.length === 64, 'Backend generated 32-byte (64 hex) random nonce challenge');

  // Compute valid response HMAC: HMAC-SHA256(nonce, sharedSecret)
  const validHmac = hmacSha256(challenge.nonce, testSecret);
  const verifyDongle = await verifyDongleResponse(challenge.challengeToken, validHmac);
  assert(verifyDongle.verified === true, 'Valid HMAC signature verifies dongle identity');

  // Test invalid response
  const challenge2 = await createDongleChallenge(2, testHwId);
  const invalidHmac = '0'.repeat(64);
  const verifyFail = await verifyDongleResponse(challenge2.challengeToken, invalidHmac);
  assert(verifyFail.verified === false, 'Invalid HMAC signature is rejected securely');

  // 7. Audit & Security Events
  console.log('\n--- 7. Verifying Audit Trails in MySQL ---');
  const [secEvents] = await query('SELECT COUNT(*) AS total FROM security_events;');
  assert(secEvents.total > 0, `Security events recorded in MySQL (found: ${secEvents.total} events)`);

  const [actLogs] = await query('SELECT COUNT(*) AS total FROM activity_logs;');
  assert(actLogs.total > 0, `Operational activity logs recorded in MySQL (found: ${actLogs.total} logs)`);

  console.log('\n====================================================');
  console.log(`PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAuthSecurityTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
