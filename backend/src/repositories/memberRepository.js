import { query } from '../database/connection.js';

export const memberRepository = {
  /**
   * Lists all members with pagination, search, and status filter
   */
  async findAll({ search = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT m.id, m.uuid, m.user_id, m.member_code, m.full_name,
             m.email_encrypted, m.email_blind_index,
             m.phone_encrypted, m.phone_blind_index,
             m.gender, m.join_date, m.is_deleted, m.created_at,
             u.username, u.is_active,
             mm.status AS membership_status,
             mm.end_date AS membership_end_date,
             mp.name AS plan_name
      FROM members m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.id = (
        SELECT id FROM member_memberships 
        WHERE member_id = m.id 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN membership_plans mp ON mm.plan_id = mp.id
      WHERE m.is_deleted = 0
    `;
    const params = [];

    if (search) {
      sql += ` AND (m.full_name LIKE ? OR m.member_code LIKE ? OR u.username LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ` ORDER BY m.id DESC LIMIT ? OFFSET ?;`;
    params.push(Number(limit), Number(offset));

    return query(sql, params);
  },

  /**
   * Finds member by primary key ID
   */
  async findById(id) {
    const rows = await query(
      `SELECT m.*, u.username, u.is_active,
              mm.status AS membership_status, mm.end_date AS membership_end_date,
              mp.name AS plan_name
       FROM members m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN member_memberships mm ON mm.member_id = m.id AND mm.id = (
         SELECT id FROM member_memberships WHERE member_id = m.id ORDER BY created_at DESC LIMIT 1
       )
       LEFT JOIN membership_plans mp ON mm.plan_id = mp.id
       WHERE m.id = ? AND m.is_deleted = 0;`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Finds member by associated user_id
   */
  async findByUserId(userId) {
    const rows = await query(
      `SELECT m.*, u.username 
       FROM members m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = ? AND m.is_deleted = 0;`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Searches member exactly by encrypted phone or email blind index
   */
  async findByBlindIndex({ emailBlindIndex = null, phoneBlindIndex = null }) {
    if (!emailBlindIndex && !phoneBlindIndex) return [];
    const conditions = [];
    const params = [];

    if (emailBlindIndex) {
      conditions.push('email_blind_index = ?');
      params.push(emailBlindIndex);
    }
    if (phoneBlindIndex) {
      conditions.push('phone_blind_index = ?');
      params.push(phoneBlindIndex);
    }

    return query(
      `SELECT m.*, u.username FROM members m
       JOIN users u ON m.user_id = u.id
       WHERE (${conditions.join(' OR ')}) AND m.is_deleted = 0;`,
      params
    );
  },

  /**
   * Updates member info
   */
  async update(id, { fullName, gender }) {
    await query(
      `UPDATE members 
       SET full_name = ?, gender = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [fullName, gender, id]
    );
  },

  /**
   * Soft deletes a member and deactivates the user login
   */
  async softDelete(id) {
    const member = await this.findById(id);
    if (!member) return false;

    await query(
      `UPDATE members 
       SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
       WHERE id = ?;`,
      [id]
    );
    await query(
      `UPDATE users 
       SET is_active = 0 
       WHERE id = ?;`,
      [member.user_id]
    );
    return true;
  },

  /**
   * Retrieves membership history for a member
   */
  async getMembershipHistory(memberId) {
    return query(
      `SELECT mm.*, mp.name AS plan_name, mp.duration_months, mp.price
       FROM member_memberships mm
       JOIN membership_plans mp ON mm.plan_id = mp.id
       WHERE mm.member_id = ?
       ORDER BY mm.created_at DESC;`,
      [memberId]
    );
  },

  /**
   * Retrieves payment transaction history for a member
   */
  async getPaymentHistory(memberId) {
    return query(
      `SELECT p.*, mp.name AS plan_name
       FROM payments p
       JOIN member_memberships mm ON p.membership_id = mm.id
       JOIN membership_plans mp ON mm.plan_id = mp.id
       WHERE p.member_id = ?
       ORDER BY p.paid_at DESC;`,
      [memberId]
    );
  }
};
