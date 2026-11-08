import { query } from '../database/connection.js';

export const membershipRepository = {
  /**
   * Retrieves all active membership plans
   */
  async findAllPlans() {
    return query(
      `SELECT * FROM membership_plans 
       WHERE is_deleted = 0 
       ORDER BY duration_months ASC;`
    );
  },

  /**
   * Finds plan by primary key ID
   */
  async findPlanById(id) {
    const rows = await query(
      `SELECT * FROM membership_plans WHERE id = ? AND is_deleted = 0;`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Creates a new membership plan
   */
  async createPlan({ code, name, durationMonths, price, description }) {
    const res = await query(
      `INSERT INTO membership_plans (code, name, duration_months, price, description, is_active)
       VALUES (?, ?, ?, ?, ?, 1);`,
      [code, name, durationMonths, price, description]
    );
    return res.insertId;
  },

  /**
   * Creates a member subscription record
   */
  async createMemberMembership(conn, { uuid, memberId, planId, startDate, endDate, status = 'ACTIVE' }) {
    const [res] = await conn.execute(
      `INSERT INTO member_memberships (uuid, member_id, plan_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [uuid, memberId, planId, startDate, endDate, status]
    );
    return res.insertId;
  },

  /**
   * Automatically expires overdue memberships
   */
  async sweepExpiredMemberships() {
    const res = await query(
      `UPDATE member_memberships 
       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'ACTIVE' AND end_date < CURDATE();`
    );
    return res.affectedRows || 0;
  }
};
