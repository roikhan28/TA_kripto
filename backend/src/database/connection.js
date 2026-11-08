import mysql from 'mysql2/promise';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
    logger.info(`MySQL pool initialized for database: ${config.db.database} on ${config.db.host}:${config.db.port}`);
  }
  return pool;
}

export async function testConnection() {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 + 1 AS result');
    logger.info('MySQL connection verified successfully.');
    return { ok: true, result: rows[0].result };
  } catch (error) {
    logger.error('MySQL connection check failed:', { error: error.message });
    return { ok: false, error: error.message };
  }
}

export async function query(sql, params = []) {
  const p = getPool();
  try {
    const [results] = await p.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Database query execution error:', { sql, error: error.message });
    throw error;
  }
}

export async function transaction(callback) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    logger.error('Transaction rolled back due to error:', { error: error.message });
    throw error;
  } finally {
    conn.release();
  }
}
