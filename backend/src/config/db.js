import mysql from 'mysql2/promise';
import { env } from './env.js';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = {
  pool,
  async query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async queryWithTimeout(sql, params = [], timeoutMs = 5000) {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute({
        sql,
        values: params,
        timeout: timeoutMs
      });
      return rows;
    } finally {
      conn.release();
    }
  }
};
