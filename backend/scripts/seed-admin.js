import { env } from '../src/config/env.js';
import { db } from '../src/config/db.js';
import { createAdmin, findUserByEmail } from '../src/services/userService.js';

const fullName = process.argv[2] || 'System Admin';
const email = process.argv[3] || 'admin@example.com';
const password = process.argv[4] || 'ChangeMe123!';

async function seed() {
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      console.log('Admin already exists for email:', email);
      process.exit(0);
    }

    const id = await createAdmin({ fullName, email, password });
    console.log('Admin created with id:', id);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
  } finally {
    await db.pool.end();
  }
}

seed();
