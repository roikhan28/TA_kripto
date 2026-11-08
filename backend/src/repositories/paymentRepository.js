import { query } from '../database/connection.js';

export const paymentRepository = {
  /**
   * Records a payment within an existing ACID transaction connection
   */
  async recordPayment(conn, { transactionCode, memberId, membershipId, amount, paymentMethod, paymentStatus = 'COMPLETED', receiptHash, notesEncrypted = null }) {
    const [res] = await conn.execute(
      `INSERT INTO payments (transaction_code, member_id, membership_id, amount, payment_method, payment_status, receipt_hash, notes_encrypted, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
      [transactionCode, memberId, membershipId, amount, paymentMethod, paymentStatus, receiptHash, notesEncrypted]
    );
    return res.insertId;
  },

  /**
   * Lists payment records with member names and plan details
   */
  async findAll({ limit = 50, offset = 0, memberId = null } = {}) {
    let sql = `
      SELECT p.*, m.member_code, m.full_name AS member_name, mp.name AS plan_name
      FROM payments p
      JOIN members m ON p.member_id = m.id
      JOIN member_memberships mm ON p.membership_id = mm.id
      JOIN membership_plans mp ON mm.plan_id = mp.id
    `;
    const params = [];

    if (memberId) {
      sql += ` WHERE p.member_id = ?`;
      params.push(memberId);
    }

    sql += ` ORDER BY p.paid_at DESC LIMIT ? OFFSET ?;`;
    params.push(Number(limit), Number(offset));

    return query(sql, params);
  },

  /**
   * Computes revenue analytics directly from database
   */
  async getRevenueStats() {
    const [rev] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS total_transactions
       FROM payments 
       WHERE payment_status = 'COMPLETED';`
    );

    // Monthly revenue trend (last 6 months)
    const monthly = await query(
      `SELECT DATE_FORMAT(paid_at, '%b %Y') AS month_label,
              SUM(amount) AS monthly_revenue,
              COUNT(*) AS count
       FROM payments
       WHERE payment_status = 'COMPLETED'
       GROUP BY DATE_FORMAT(paid_at, '%Y-%m'), month_label
       ORDER BY MIN(paid_at) ASC
       LIMIT 6;`
    );

    return {
      totalRevenue: Number(rev.total_revenue),
      totalTransactions: Number(rev.total_transactions),
      monthlyTrends: monthly.map(m => ({
        month: m.month_label,
        revenue: Number(m.monthly_revenue),
        transactions: Number(m.count)
      }))
    };
  }
};
