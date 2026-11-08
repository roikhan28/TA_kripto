import { query } from '../database/connection.js';

export const userRepository = {
  /**
   * Finds user by username including role details
   */
  async findByUsername(username) {
    const rows = await query(
      `SELECT u.id, u.uuid, u.username, u.password_hash, u.role_id, 
              u.is_active, u.failed_attempts, u.locked_until, u.last_login_at,
              r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ? AND u.is_deleted = 0;`,
      [username]
    );
    return rows[0] || null;
  },

  /**
   * Finds user by primary key ID
   */
  async findById(id) {
    const rows = await query(
      `SELECT u.id, u.uuid, u.username, u.role_id, u.is_active, 
              u.failed_attempts, u.locked_until, u.last_login_at,
              r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_deleted = 0;`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Creates a new user record
   */
  async create({ uuid, username, passwordHash, roleId }) {
    const res = await query(
      `INSERT INTO users (uuid, username, password_hash, role_id, is_active)
       VALUES (?, ?, ?, ?, 1);`,
      [uuid, username, passwordHash, roleId]
    );
    return res.insertId;
  },

  /**
   * Increments failed login count
   */
  async incrementFailedAttempts(userId) {
    await query(
      `UPDATE users 
       SET failed_attempts = failed_attempts + 1 
       WHERE id = ?;`,
      [userId]
    );
    const rows = await query(
      `SELECT failed_attempts FROM users WHERE id = ?;`,
      [userId]
    );
    return rows[0]?.failed_attempts || 0;
  },

  /**
   * Resets failed login count
   */
  async resetFailedAttempts(userId) {
    await query(
      `UPDATE users 
       SET failed_attempts = 0, locked_until = NULL 
       WHERE id = ?;`,
      [userId]
    );
  },

  /**
   * Locks account temporarily until specified timestamp
   */
  async lockAccount(userId, lockUntilDate) {
    await query(
      `UPDATE users 
       SET locked_until = ? 
       WHERE id = ?;`,
      [lockUntilDate, userId]
    );
  },

  /**
   * Updates last login timestamp and resets failed count
   */
  async recordLoginSuccess(userId) {
    await query(
      `UPDATE users 
       SET last_login_at = CURRENT_TIMESTAMP, failed_attempts = 0, locked_until = NULL 
       WHERE id = ?;`,
      [userId]
    );
  },

  /**
   * Retrieves all permissions associated with a user's role
   */
  async getUserPermissions(userId) {
    const rows = await query(
      `SELECT p.code 
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = ?;`,
      [userId]
    );
    return rows.map(r => r.code);
  }
};
