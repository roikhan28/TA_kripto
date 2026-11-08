import { query } from '../database/connection.js';

export const scheduleRepository = {
  /**
   * Checks for overlapping sessions for trainer or member (Double-booking check)
   */
  async findOverlaps({ trainerId, memberId, sessionDate, startTime, endTime, excludeId = null }) {
    let sql = `
      SELECT s.*, t.full_name AS trainer_name, m.full_name AS member_name
      FROM schedules s
      JOIN trainers t ON s.trainer_id = t.id
      JOIN members m ON s.member_id = m.id
      WHERE s.session_date = ?
        AND s.status != 'CANCELLED'
        AND (s.start_time < ? AND s.end_time > ?)
        AND (s.trainer_id = ? OR s.member_id = ?)
    `;
    const params = [sessionDate, endTime, startTime, trainerId, memberId];

    if (excludeId) {
      sql += ` AND s.id != ?`;
      params.push(excludeId);
    }

    return query(sql, params);
  },

  /**
   * Creates a new scheduled fitness session
   */
  async create({ uuid, trainerId, memberId, sessionDate, startTime, endTime, notes }) {
    const res = await query(
      `INSERT INTO schedules (uuid, trainer_id, member_id, session_date, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?);`,
      [uuid, trainerId, memberId, sessionDate, startTime, endTime, notes]
    );
    return res.insertId;
  },

  /**
   * Retrieves schedules with optional filtering
   */
  async findAll({ trainerId = null, memberId = null, startDate = null, endDate = null } = {}) {
    let sql = `
      SELECT s.*, t.full_name AS trainer_name, m.full_name AS member_name, m.member_code
      FROM schedules s
      JOIN trainers t ON s.trainer_id = t.id
      JOIN members m ON s.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (trainerId) {
      sql += ` AND s.trainer_id = ?`;
      params.push(trainerId);
    }
    if (memberId) {
      sql += ` AND s.member_id = ?`;
      params.push(memberId);
    }
    if (startDate) {
      sql += ` AND s.session_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND s.session_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY s.session_date ASC, s.start_time ASC;`;
    return query(sql, params);
  },

  /**
   * Updates schedule status (ATTENDED, CANCELLED, RESCHEDULED)
   */
  async updateStatus(id, status) {
    await query(
      `UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [status, id]
    );
  }
};
