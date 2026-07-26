import bcrypt from 'bcryptjs';
import { db } from '../src/config/db.js';

const cliName = process.argv[2];
const cliEmail = process.argv[3];
const cliPassword = process.argv[4];

const adminName = cliName || process.env.ADMIN_NAME;
const adminEmail = (cliEmail || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = cliPassword || process.env.ADMIN_PASSWORD;
const allowAdditionalAdmin = String(process.env.ALLOW_ADDITIONAL_ADMIN || '').toLowerCase() === 'true';

if (!adminName || !adminEmail || !adminPassword) {
  console.error('Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD');
  process.exit(1);
}

async function createAdmin() {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const [existingUsers] = await conn.execute(
      'SELECT id, email, role, status FROM users WHERE email = ? FOR UPDATE',
      [adminEmail]
    );

    if (existingUsers.length) {
      const existing = existingUsers[0];
      await conn.execute(
        `UPDATE users
         SET full_name = ?, password_hash = ?, role = 'ADMIN', status = 'ACTIVE'
         WHERE id = ?`,
        [adminName, passwordHash, existing.id]
      );

      await conn.commit();
      console.log(`Admin updated with id: ${existing.id}`);
      return;
    }

    const [existingAdmins] = await conn.execute(
      "SELECT id, email, status FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1 FOR UPDATE"
    );

    if (existingAdmins.length && !allowAdditionalAdmin) {
      await conn.rollback();
      const existing = existingAdmins[0];
      console.error(
        `Refusing to create a second admin. Existing admin id=${existing.id}, email=${existing.email}, status=${existing.status}. ` +
        'Set ALLOW_ADDITIONAL_ADMIN=true only if you intentionally want another admin account.'
      );
      process.exitCode = 1;
      return;
    }

    const [result] = await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      [adminName, adminEmail, passwordHash]
    );

    await conn.commit();
    console.log(`Admin created with id: ${result.insertId}`);
  } catch (err) {
    await conn.rollback();
    console.error('Failed to create admin:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await db.pool.end();
  }
}

createAdmin();
