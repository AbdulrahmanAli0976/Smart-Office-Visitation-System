import { db } from '../src/config/db.js';
import { createVisitor } from '../src/services/visitorService.js';

async function runTaskB3SoftDeleteTest() {
  console.log('--- Starting Task B3 Test: Soft-Delete Compatible UNIQUE Constraint Verification ---');

  try {
    const testPhone = '+2348777770000';
    const testCode = 'SFT-001';

    // Cleanup leftover test visitors
    await db.query(`DELETE FROM visits WHERE visitor_id IN (SELECT id FROM visitors WHERE phone_number = ?)`, [testPhone]);
    await db.query(`DELETE FROM visitors WHERE phone_number = ?`, [testPhone]);

    // 1. Create Active Visitor 1
    const v1Id = await createVisitor({ fullName: 'SoftDelete V1', phoneNumber: testPhone, visitorType: 'BD', code: testCode });
    console.log(`Step 1: Created active visitor 1 with ID: ${v1Id}`);

    // 2. Soft-delete Visitor 1
    await db.query('UPDATE visitors SET deleted_at = NOW() WHERE id = ?', [v1Id]);
    console.log(`Step 2: Soft-deleted visitor 1 ID: ${v1Id}`);

    // 3. Re-register Visitor 2 with the EXACT SAME phone number and code
    const v2Id = await createVisitor({ fullName: 'ReRegistered V2', phoneNumber: testPhone, visitorType: 'BD', code: testCode });
    console.log(`Step 3: Re-registered active visitor 2 with ID: ${v2Id} using SAME phone and code!`);

    if (!v2Id) {
      throw new Error('Re-registration of soft-deleted phone/code failed!');
    }

    // 4. Verify DB state: Visitor 1 is deleted (active_phone IS NULL), Visitor 2 is active (active_phone = testPhone)
    const rows = await db.query('SELECT id, full_name, phone_number, active_phone, deleted_at FROM visitors WHERE phone_number = ? ORDER BY id ASC', [testPhone]);
    console.table(rows);

    if (rows.length !== 2) {
      throw new Error(`Expected 2 rows in DB, found ${rows.length}`);
    }

    if (rows[0].active_phone !== null || rows[1].active_phone !== testPhone) {
      throw new Error('Generated active_phone values do not match expected NULL and phone_number!');
    }

    // Cleanup test data
    await db.query(`DELETE FROM visits WHERE visitor_id IN (?, ?)`, [v1Id, v2Id]);
    await db.query(`DELETE FROM visitors WHERE id IN (?, ?)`, [v1Id, v2Id]);

    console.log('\n✅ TASK B3 PASSED: Soft-deleted visitors no longer block re-registering active visitors with same phone/code!');
    process.exit(0);
  } catch (err) {
    console.error('❌ TASK B3 TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTaskB3SoftDeleteTest();
