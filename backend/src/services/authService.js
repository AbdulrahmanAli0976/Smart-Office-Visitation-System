import { db } from '../config/db.js';

export async function blacklistToken(token, expiresAt) {
  await db.query(
    'INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)',
    [token, expiresAt]
  );
}

export async function isTokenBlacklisted(token) {
  const rows = await db.query(
    'SELECT id FROM token_blacklist WHERE token = ? AND expires_at > NOW()',
    [token]
  );
  return rows.length > 0;
}

export async function cleanExpiredTokens() {
  await db.query('DELETE FROM token_blacklist WHERE expires_at <= NOW()');
}
