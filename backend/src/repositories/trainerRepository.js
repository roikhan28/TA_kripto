import { query } from '../database/connection.js';

export const trainerRepository = {
  /**
   * Retrieves all trainers with assigned member counts
   */
  async findAll() {
    return query(
      `SELECT t.*, u.username,
              COUNT(DISTINCT s.member_id) AS active_assigned_members
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN schedules s ON s.trainer_id = t.id AND s.session_date >= CURDATE()
       WHERE t.is_deleted = 0
       GROUP BY t.id
       ORDER BY t.full_name ASC;`
    );
  },

  /**
   * Finds trainer by ID
   */
  async findById(id) {
    const rows = await query(
      `SELECT t.*, u.username FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.is_deleted = 0;`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Finds trainer by associated user_id
   */
  async findByUserId(userId) {
    const rows = await query(
      `SELECT t.*, u.username FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = ? AND t.is_deleted = 0;`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Creates a trainer profile
   */
  async create({ uuid, userId, trainerCode, fullName, specialization, phoneEncrypted, phoneBlindIndex, certificationInfo, bio }) {
    const res = await query(
      `INSERT INTO trainers (uuid, user_id, trainer_code, full_name, specialization, phone_encrypted, phone_blind_index, certification_info, bio, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [uuid, userId, trainerCode, fullName, specialization, phoneEncrypted, phoneBlindIndex, certificationInfo, bio]
    );
    return res.insertId;
  }
};
