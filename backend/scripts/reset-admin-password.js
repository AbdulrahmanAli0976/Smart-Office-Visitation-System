import bcrypt from 'bcryptjs';
import { db } from '../src/config/db.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/reset-admin-password.js <email> <password>');
  process.exit(1);
}

async function resetPassword() {
  const hash = await bcrypt.hash(password, 12);
  const [result] = await db.pool.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, email]
  );
  console.log('updated rows', result.affectedRows);
  await db.pool.end();
}

resetPassword().catch((err) => {
  console.error('Failed to reset password:', err.message);
  process.exit(1);
});
