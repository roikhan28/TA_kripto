import { gymService } from '../backend/src/services/gymService.js';
import { memberRepository } from '../backend/src/repositories/memberRepository.js';
import { membershipRepository } from '../backend/src/repositories/membershipRepository.js';
import { paymentRepository } from '../backend/src/repositories/paymentRepository.js';
import { trainerRepository } from '../backend/src/repositories/trainerRepository.js';
import { workoutRepository } from '../backend/src/repositories/workoutRepository.js';
import { scheduleRepository } from '../backend/src/repositories/scheduleRepository.js';
import { authService } from '../backend/src/services/authService.js';
import { generateBlindIndex } from '../crypto/blind_index.js';
import { query } from '../backend/src/database/connection.js';

async function runGymManagementTests() {
  console.log('====================================================');
  console.log('  GYMVAULT V2.0 - PHASE 3 GYM MANAGEMENT TESTS     ');
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

  // 1. Dashboard Metrics from Live Database
  console.log('--- 1. Testing Live Database Dashboard Metrics ---');
  const metrics = await gymService.getDashboardMetrics();
  assert(metrics && typeof metrics.members.total === 'number', 'Dashboard returns actual member metrics');
  assert(typeof metrics.finance.totalRevenue === 'number', 'Dashboard returns actual revenue metrics');
  assert(Array.isArray(metrics.finance.monthlyTrends), 'Dashboard returns monthly revenue trends array');
  assert(Array.isArray(metrics.recentActivities), 'Dashboard returns recent activity logs from MySQL');

  // 2. Member Creation with Encrypted PII and Blind Index
  console.log('\n--- 2. Testing Member CRUD & Encrypted PII ---');
  const testUsername = 'member_test_' + Date.now();
  const testEmail = 'budi.test@example.com';
  const testPhone = '081299887766';

  const regRes = await authService.register({
    username: testUsername,
    password: 'Password123!',
    roleName: 'MEMBER',
    fullName: 'Budi Test Santoso',
    email: testEmail,
    phone: testPhone
  });
  assert(regRes && regRes.userId, 'New member registered with credentials in users & members tables');

  // Verify PII is encrypted in MySQL
  const [rawDbMember] = await query('SELECT * FROM members WHERE user_id = ?;', [regRes.userId]);
  assert(rawDbMember.email_encrypted.startsWith('enc:v1:'), 'Email stored encrypted with AES-256-GCM envelope');
  assert(rawDbMember.phone_encrypted.startsWith('enc:v1:'), 'Phone stored encrypted with AES-256-GCM envelope');

  // Verify HMAC Blind Index exact search
  const phoneBi = generateBlindIndex(testPhone);
  assert(rawDbMember.phone_blind_index === phoneBi, 'Phone blind index matches HMAC-SHA256 of normalized phone');

  const biSearch = await memberRepository.findByBlindIndex({ phoneBlindIndex: phoneBi });
  assert(biSearch.length > 0 && biSearch[0].id === rawDbMember.id, 'Blind index finds encrypted member record in O(1)');

  // Verify decryption of PII for authorized view
  const decryptedMember = gymService.decryptMemberPII(rawDbMember);
  assert(decryptedMember.email === testEmail, 'Email decrypted accurately from AES-256-GCM');
  assert(decryptedMember.phone === testPhone, 'Phone decrypted accurately from AES-256-GCM');

  // 3. Soft Delete Member
  console.log('\n--- 3. Testing Soft Delete ---');
  const softDelOk = await memberRepository.softDelete(rawDbMember.id);
  assert(softDelOk === true, 'Soft delete executed successfully');

  const [deletedRecord] = await query('SELECT is_deleted, deleted_at FROM members WHERE id = ?;', [rawDbMember.id]);
  assert(deletedRecord.is_deleted === 1 && deletedRecord.deleted_at !== null, 'Member row marked is_deleted=1 with timestamp');

  const [deactivatedUser] = await query('SELECT is_active FROM users WHERE id = ?;', [regRes.userId]);
  assert(deactivatedUser.is_active === 0, 'Associated user login deactivated in users table');

  // 4. Payment Management & ACID Transaction
  console.log('\n--- 4. Testing ACID Payment Transaction & Membership Activation ---');
  // Use seed member Alice (id: 1)
  const [plans] = await query('SELECT * FROM membership_plans ORDER BY id ASC LIMIT 1;');
  assert(plans && plans.id, 'Found active membership plan in database');

  const payRes = await gymService.processPayment({
    memberId: 1,
    planId: plans.id,
    amount: plans.price,
    paymentMethod: 'QRIS',
    notes: 'Pembayaran langganan gym via QRIS Statis'
  });

  assert(payRes && payRes.transactionCode.startsWith('TRX-'), 'Payment processed with unique TRX code');
  assert(payRes.receiptHash && payRes.receiptHash.length === 64, 'Generated 64-char SHA-256 digital receipt hash');

  // Verify payment recorded in MySQL
  const [dbPayment] = await query('SELECT * FROM payments WHERE id = ?;', [payRes.paymentId]);
  assert(dbPayment && dbPayment.payment_status === 'COMPLETED', 'Payment record verified in MySQL as COMPLETED');
  assert(dbPayment.receipt_hash === payRes.receiptHash, 'Receipt hash in MySQL matches generated integrity hash');

  // Verify membership status updated in MySQL
  const [dbMembership] = await query(
    `SELECT mm.*, DATE_FORMAT(mm.end_date, '%Y-%m-%d') AS end_date_str 
     FROM member_memberships mm
     JOIN payments p ON p.membership_id = mm.id
     WHERE p.id = ?;`,
    [payRes.paymentId]
  );
  assert(dbMembership.status === 'ACTIVE', 'Member membership activated concurrently in transaction');
  assert(dbMembership.end_date_str === payRes.endDate, 'Membership expiration calculated accurately by backend');

  // 5. Trainer & Workout Program Management
  console.log('\n--- 5. Testing Workout Program & Details ---');
  const trainers = await trainerRepository.findAll();
  assert(trainers.length > 0, 'Trainer repository lists active gym trainers');

  const trainerId = trainers[0].id;
  const workoutPlanId = await workoutRepository.createPlan({
    uuid: 'wkt_' + Date.now(),
    trainerId,
    memberId: 1,
    title: 'Strength & Hypertrophy Routine',
    goalDescription: 'Increase compound lift totals',
    startDate: '2026-11-10',
    endDate: '2026-12-10',
    exercises: [
      { dayOfWeek: 'MONDAY', exerciseName: 'Barbell Bench Press', sets: 4, reps: 10, restSeconds: 90 },
      { dayOfWeek: 'WEDNESDAY', exerciseName: 'Barbell Back Squat', sets: 4, reps: 8, restSeconds: 120 }
    ]
  });
  assert(workoutPlanId > 0, 'Created structured workout plan with nested exercise details');

  const memberWorkouts = await workoutRepository.findByMemberId(1);
  assert(memberWorkouts.length > 0, 'Retrieved member workout programs');
  assert(memberWorkouts[0].details.length === 2, 'Retrieved 2 nested workout exercise details');

  // 6. Schedule Management & Double-Booking Prevention
  console.log('\n--- 6. Testing Schedule Management & Double-Booking Validation ---');
  const sessionDate = '2026-11-20';
  await query('DELETE FROM schedules WHERE session_date = ?;', [sessionDate]);

  // Session A: 09:00 - 10:00 (Success)
  const schedA = await gymService.createSchedule({
    trainerId,
    memberId: 1,
    sessionDate,
    startTime: '09:00',
    endTime: '10:00',
    notes: 'Sesi pagi intensif'
  });
  assert(schedA.scheduleId > 0, 'Session A scheduled successfully without conflict');

  // Session B: Overlapping conflict (09:30 - 10:30) with same trainer -> MUST FAIL
  let conflictBlocked = false;
  try {
    await gymService.createSchedule({
      trainerId,
      memberId: 1,
      sessionDate,
      startTime: '09:30',
      endTime: '10:30',
      notes: 'Sesi bentrok'
    });
  } catch (err) {
    conflictBlocked = true;
    assert(err.message.includes('Jadwal bentrok'), 'Double-booking conflict detected and blocked by backend');
  }
  assert(conflictBlocked, 'Overlapping schedule rejected with descriptive error');

  // Session C: Non-conflicting time (10:30 - 11:30) -> MUST SUCCEED
  const schedC = await gymService.createSchedule({
    trainerId,
    memberId: 1,
    sessionDate,
    startTime: '10:30',
    endTime: '11:30',
    notes: 'Sesi lanjutan non-bentrok'
  });
  assert(schedC.scheduleId > 0, 'Non-conflicting session C scheduled successfully');

  console.log('\n====================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runGymManagementTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
