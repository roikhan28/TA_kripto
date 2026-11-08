import { execSync } from 'child_process';

console.log('Running GYMVAULT Verification Suites...\n');

try {
  execSync('node tests/foundation-test.js', { stdio: 'inherit' });
  execSync('node tests/auth-security-test.js', { stdio: 'inherit' });
  execSync('node tests/gym-management-test.js', { stdio: 'inherit' });
  console.log('\x1b[32m✔ ALL PHASE 1, 2, AND 3 TEST SUITES PASSED SUCCESSFULLY!\x1b[0m\n');
} catch (err) {
  console.error('\x1b[31m✖ TEST SUITE RUNNER ENCOUNTERED A FAILURE\x1b[0m');
  process.exit(1);
}
