#!/usr/bin/env node
import { db } from '../src/config/db.js';
import { normalizePhone } from '../src/utils/normalizePhone.js';

function fallbackDigits(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return `+${digits}`;
}

async function main() {
  console.log('Starting visitor phone normalization and deduplication...');
  const conn = await db.pool.getConnection();
  let duplicatesRemoved = 0;
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT id, phone_number FROM visitors WHERE deleted_at IS NULL ORDER BY created_at ASC'
    );

    for (const visitor of rows) {
      const normalized = normalizePhone(visitor.phone_number);
      const normalizedPhone = normalized || fallbackDigits(visitor.phone_number);
      if (!normalizedPhone) {
        console.warn(`Skipping visitor ${visitor.id}: could not normalize phone '${visitor.phone_number}'`);
        continue;
      }
      await conn.execute('UPDATE visitors SET phone_number = ? WHERE id = ?', [normalizedPhone, visitor.id]);
    }

    const [normalizedRows] = await conn.execute(
      'SELECT id, phone_number, created_at FROM visitors WHERE deleted_at IS NULL ORDER BY created_at ASC'
    );

    const groups = new Map();
    for (const visitor of normalizedRows) {
      const phone = visitor.phone_number;
      if (!phone) continue;
      if (!groups.has(phone)) {
        groups.set(phone, []);
      }
      groups.get(phone).push(visitor);
    }

    for (const [phone, group] of groups.entries()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
      const keeper = group[0];
      const duplicates = group.slice(1);
      for (const duplicate of duplicates) {
        console.log(`Merging visitor ${duplicate.id} into ${keeper.id} (phone ${phone})`);
        await conn.execute('UPDATE visits SET visitor_id = ? WHERE visitor_id = ?', [keeper.id, duplicate.id]);
        await conn.execute('DELETE FROM visitors WHERE id = ?', [duplicate.id]);
        duplicatesRemoved += 1;
      }
    }

    await conn.commit();
    console.log(`Normalization/deduplication complete (${duplicatesRemoved} duplicate(s) removed).`);
  } catch (err) {
    await conn.rollback();
    console.error('Deduplication failed:', err.message);
    throw err;
  } finally {
    conn.release();
    await db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
