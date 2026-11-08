import crypto from 'crypto';
import { memberRepository } from '../repositories/memberRepository.js';
import { membershipRepository } from '../repositories/membershipRepository.js';
import { paymentRepository } from '../repositories/paymentRepository.js';
import { trainerRepository } from '../repositories/trainerRepository.js';
import { workoutRepository } from '../repositories/workoutRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { transaction, query } from '../database/connection.js';
import { generateUUID, sha256 } from '../../../crypto/hashing.js';
import { encryptAESGCM, decryptAESGCM } from '../../../crypto/aes.js';
import { getDatabaseKey } from '../../../crypto/key_manager.js';
import { generateBlindIndex } from '../../../crypto/blind_index.js';
import { logActivity } from '../../../security/audit_logger.js';
import { logger } from '../utils/logger.js';

export const gymService = {
  /**
   * Retrieves real-time operational metrics for the Admin dashboard directly from MySQL
   */
  async getDashboardMetrics() {
    // 1. Run overdue sweep first
    await membershipRepository.sweepExpiredMemberships();

    // 2. Member metrics
    const [memberCounts] = await query(`
      SELECT 
        COUNT(*) AS total_members,
        SUM(CASE WHEN mm.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_members,
        SUM(CASE WHEN mm.status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_members,
        SUM(CASE WHEN mm.status = 'ACTIVE' AND mm.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS near_expiry_members
      FROM members m
      LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.id = (
        SELECT id FROM member_memberships WHERE member_id = m.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE m.is_deleted = 0;
    `);

    // 3. Trainer count
    const [trainerCount] = await query(`SELECT COUNT(*) AS total_trainers FROM trainers WHERE is_deleted = 0;`);

    // 4. Financial metrics
    const financialStats = await paymentRepository.getRevenueStats();

    // 5. Recent activity logs
    const recentActivities = await query(`
      SELECT a.*, u.username 
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 6;
    `);

    return {
      members: {
        total: Number(memberCounts.total_members) || 0,
        active: Number(memberCounts.active_members) || 0,
        expired: Number(memberCounts.expired_members) || 0,
        nearExpiry: Number(memberCounts.near_expiry_members) || 0
      },
      trainers: {
        total: Number(trainerCount.total_trainers) || 0
      },
      finance: financialStats,
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        action: a.action,
        entityType: a.entity_type,
        username: a.username || 'System',
        createdAt: a.created_at
      }))
    };
  },

  /**
   * Processes a subscription payment using an ACID database transaction.
   * Both membership subscription and payment records are guaranteed consistent.
   */
  async processPayment({ memberId, planId, amount, paymentMethod = 'TRANSFER', notes = '', recordedByUserId = null }) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new Error('Member tidak ditemukan');

    const plan = await membershipRepository.findPlanById(planId);
    if (!plan) throw new Error('Paket membership tidak valid');

    const dbKey = getDatabaseKey();
    const transactionCode = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return transaction(async (conn) => {
      // 1. Calculate start date and exact expiration date in backend
      const [curMembership] = await conn.execute(
        `SELECT end_date, status FROM member_memberships 
         WHERE member_id = ? AND status = 'ACTIVE' AND end_date >= CURDATE()
         ORDER BY end_date DESC LIMIT 1;`,
        [memberId]
      );

      let startDate = new Date();
      if (curMembership && curMembership.length > 0) {
        // Extend from current active end date
        startDate = new Date(curMembership[0].end_date);
        startDate.setDate(startDate.getDate() + 1);
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      const strStartDate = startDate.toISOString().split('T')[0];
      const strEndDate = endDate.toISOString().split('T')[0];

      // 2. Create member_memberships record
      const membershipUuid = generateUUID();
      const membershipId = await membershipRepository.createMemberMembership(conn, {
        uuid: membershipUuid,
        memberId,
        planId,
        startDate: strStartDate,
        endDate: strEndDate,
        status: 'ACTIVE'
      });

      // 3. Compute digital receipt SHA-256 hash for integrity
      const receiptCanonicalData = JSON.stringify({
        transactionCode,
        memberCode: member.member_code,
        planCode: plan.code,
        amount: Number(amount || plan.price),
        paidAt: new Date().toISOString()
      });
      const receiptHash = sha256(receiptCanonicalData);

      // 4. Encrypt sensitive payment notes with AES-256-GCM
      let notesEncrypted = null;
      if (notes) {
        notesEncrypted = encryptAESGCM(notes, dbKey, `pay_${transactionCode}`).envelope;
      }

      // 5. Record into payments table
      const paymentId = await paymentRepository.recordPayment(conn, {
        transactionCode,
        memberId,
        membershipId,
        amount: Number(amount || plan.price),
        paymentMethod,
        paymentStatus: 'COMPLETED',
        receiptHash,
        notesEncrypted
      });

      // 6. Audit log
      await logActivity({
        userId: recordedByUserId,
        action: 'PAYMENT_PROCESSED',
        entityType: 'PAYMENT',
        entityId: paymentId,
        details: { transactionCode, amount: plan.price, memberId, planId }
      });

      logger.info(`Processed payment ${transactionCode} for member: ${member.member_code} [Amount: ${plan.price}]`);

      return {
        paymentId,
        transactionCode,
        receiptHash,
        startDate: strStartDate,
        endDate: strEndDate,
        planName: plan.name,
        amount: plan.price
      };
    });
  },

  /**
   * Creates a scheduled workout with strict double-booking conflict validation
   */
  async createSchedule({ trainerId, memberId, sessionDate, startTime, endTime, notes = '', createdByUserId = null }) {
    // 1. Conflict detection
    const overlaps = await scheduleRepository.findOverlaps({
      trainerId,
      memberId,
      sessionDate,
      startTime,
      endTime
    });

    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      const isTrainerConflict = conflict.trainer_id === trainerId;
      throw new Error(
        `Jadwal bentrok! ${isTrainerConflict ? `Pelatih ${conflict.trainer_name}` : `Member ${conflict.member_name}`} sudah memiliki sesi latihan pada ${sessionDate} pukul ${conflict.start_time} - ${conflict.end_time}`
      );
    }

    const uuid = generateUUID();
    const scheduleId = await scheduleRepository.create({
      uuid,
      trainerId,
      memberId,
      sessionDate,
      startTime,
      endTime,
      notes
    });

    await logActivity({
      userId: createdByUserId,
      action: 'SCHEDULE_CREATED',
      entityType: 'SCHEDULE',
      entityId: scheduleId,
      details: { trainerId, memberId, sessionDate, startTime, endTime }
    });

    return { scheduleId, success: true };
  },

  /**
   * Helper to decrypt sensitive member PII for authorized view
   */
  decryptMemberPII(member) {
    if (!member) return null;
    const dbKey = getDatabaseKey();
    const m = { ...member };

    if (m.phone_encrypted) {
      try {
        m.phone = decryptAESGCM(m.phone_encrypted, dbKey, `member_phone_${m.user_id}`);
      } catch (e) {
        m.phone = '[Decryption Failed]';
      }
    } else {
      m.phone = '-';
    }

    if (m.email_encrypted) {
      try {
        m.email = decryptAESGCM(m.email_encrypted, dbKey, `member_email_${m.user_id}`);
      } catch (e) {
        m.email = '[Decryption Failed]';
      }
    } else {
      m.email = '-';
    }

    return m;
  }
};
