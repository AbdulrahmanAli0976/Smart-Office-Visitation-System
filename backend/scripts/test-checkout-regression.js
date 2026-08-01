import { db } from '../src/config/db.js';
import { createVisitAtomic, completeVisit } from '../src/services/visitService.js';
import { createVisitor } from '../src/services/visitorService.js';

async function runCheckoutRegressionTest() {
  console.log('--- Starting Checkout Regression Test (3 Sequential Visit Cycles) ---');

  try {
    // 1. Setup Test Visitor
    const testPhone = '+2348999990000';
    const testCode = 'REG-TEST-001';
    
    // Clean existing test data if left over from previous runs
    await db.query(`DELETE FROM visits WHERE visitor_id IN (SELECT id FROM visitors WHERE phone_number = ?)`, [testPhone]);
    await db.query(`DELETE FROM visitors WHERE phone_number = ?`, [testPhone]);

    const visitorId = await createVisitor({
      fullName: 'Regression Test Visitor',
      phoneNumber: testPhone,
      visitorType: 'BD',
      code: testCode
    });

    console.log(`Created test visitor with ID: ${visitorId}`);

    const officerId = 1; // Existing admin/officer ID

    // 2. Perform Cycle 1 (Check-in -> Check-out)
    console.log('\n--- Cycle 1 ---');
    const checkin1 = await createVisitAtomic({
      visitorId,
      officerId,
      purpose: 'Regression Testing Cycle 1',
      personToSee: 'QA Lead'
    });
    if (checkin1.error || !checkin1.visitId) {
      throw new Error(`Cycle 1 Check-in failed: ${JSON.stringify(checkin1)}`);
    }
    console.log(`Cycle 1 Checked In: Visit ID = ${checkin1.visitId}`);

    const checkout1 = await completeVisit(checkin1.visitId);
    if (checkout1 !== 1) {
      throw new Error(`Cycle 1 Check-out failed! Affected rows: ${checkout1}`);
    }
    console.log(`Cycle 1 Checked Out successfully.`);

    // 3. Perform Cycle 2 (Check-in -> Check-out)
    console.log('\n--- Cycle 2 ---');
    const checkin2 = await createVisitAtomic({
      visitorId,
      officerId,
      purpose: 'Regression Testing Cycle 2',
      personToSee: 'QA Lead'
    });
    if (checkin2.error || !checkin2.visitId) {
      throw new Error(`Cycle 2 Check-in failed: ${JSON.stringify(checkin2)}`);
    }
    console.log(`Cycle 2 Checked In: Visit ID = ${checkin2.visitId}`);

    const checkout2 = await completeVisit(checkin2.visitId);
    if (checkout2 !== 1) {
      throw new Error(`Cycle 2 Check-out failed! Affected rows: ${checkout2}`);
    }
    console.log(`Cycle 2 Checked Out successfully.`);

    // 4. Perform Cycle 3 (Check-in -> Check-out)
    console.log('\n--- Cycle 3 ---');
    const checkin3 = await createVisitAtomic({
      visitorId,
      officerId,
      purpose: 'Regression Testing Cycle 3',
      personToSee: 'QA Lead'
    });
    if (checkin3.error || !checkin3.visitId) {
      throw new Error(`Cycle 3 Check-in failed: ${JSON.stringify(checkin3)}`);
    }
    console.log(`Cycle 3 Checked In: Visit ID = ${checkin3.visitId}`);

    const checkout3 = await completeVisit(checkin3.visitId);
    if (checkout3 !== 1) {
      throw new Error(`Cycle 3 Check-out failed! Affected rows: ${checkout3}`);
    }
    console.log(`Cycle 3 Checked Out successfully.`);

    // 5. Verify database state for all 3 visits
    const rows = await db.query(
      `SELECT id, visitor_id, status, is_active FROM visits WHERE visitor_id = ? ORDER BY id ASC`,
      [visitorId]
    );

    console.log('\nFinal DB state for test visitor:');
    console.table(rows);

    if (rows.length !== 3) {
      throw new Error(`Expected 3 visits, found ${rows.length}`);
    }

    const allCompleted = rows.every((r) => r.status === 'COMPLETED' && r.is_active === null);
    if (!allCompleted) {
      throw new Error('Not all visits have status=COMPLETED and is_active=null!');
    }

    // Cleanup test data
    await db.query(`DELETE FROM visits WHERE visitor_id = ?`, [visitorId]);
    await db.query(`DELETE FROM visitors WHERE id = ?`, [visitorId]);

    console.log('\n✅ REGRESSION TEST PASSED: All 3 visit cycles checked in and checked out cleanly without constraint errors!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ REGRESSION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runCheckoutRegressionTest();
