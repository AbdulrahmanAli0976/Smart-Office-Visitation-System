import { db } from '../src/config/db.js';
import { createOfficer, createAdmin } from '../src/services/userService.js';
import { createVisitor } from '../src/services/visitorService.js';
import { createVisitAtomic } from '../src/services/visitService.js';

async function runTaskA3SafeDeletionTest() {
  console.log('--- Starting Task A3 Comprehensive Test: Safe Officer Deletion & Edge Cases ---');

  try {
    // Authenticate Admin to get HTTP token
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aliyakubuabdulrahman@gmail.com', password: '@SmartStrongSystem2026' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;

    // Cleanup left-over test officers
    await db.query(`DELETE FROM visits WHERE officer_id IN (SELECT id FROM users WHERE email LIKE 'taskA3.%')`);
    await db.query(`DELETE FROM users WHERE email LIKE 'taskA3.%'`);

    // Setup Test Visitor
    const testPhone = '+2348555554444';
    await db.query(`DELETE FROM visits WHERE visitor_id IN (SELECT id FROM visitors WHERE phone_number = ?)`, [testPhone]);
    await db.query(`DELETE FROM visitors WHERE phone_number = ?`, [testPhone]);
    const visitorId = await createVisitor({ fullName: 'A3 Test Visitor', phoneNumber: testPhone, visitorType: 'BD', code: 'A3-001' });

    // ----------------------------------------------------------------------
    // TEST EDGE CASE 1: Officer with historical visits -> Deactivated
    // ----------------------------------------------------------------------
    console.log('\n--- Testing Edge Case 1: Officer with visits ---');
    const officer1Id = await createOfficer({ fullName: 'Officer With Visits', email: 'taskA3.officer1@example.com', password: 'Password123!' });
    await createVisitAtomic({ visitorId, officerId: officer1Id, purpose: 'Test A3', personToSee: 'Manager' });

    const res1 = await fetch(`http://localhost:4000/api/admin/officers/${officer1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data1 = await res1.json();
    console.log('Edge Case 1 Response:', res1.status, data1);

    if (res1.status !== 200 || data1.data?.action !== 'deactivated' || data1.data?.deactivated !== true) {
      throw new Error(`Edge Case 1 Failed! Expected HTTP 200 deactivated status, got: ${JSON.stringify(data1)}`);
    }

    const [dbOfficer1] = await db.query('SELECT status FROM users WHERE id = ?', [officer1Id]);
    if (dbOfficer1?.status !== 'INACTIVE') {
      throw new Error(`Edge Case 1 DB Verification Failed! Status is ${dbOfficer1?.status}, expected INACTIVE`);
    }
    console.log('✅ Edge Case 1 Passed: Officer with visits was safely DEACTIVATED.');

    // ----------------------------------------------------------------------
    // TEST EDGE CASE 2: Officer with NO visits -> Hard Deleted
    // ----------------------------------------------------------------------
    console.log('\n--- Testing Edge Case 2: Officer with NO visits ---');
    const officer2Id = await createOfficer({ fullName: 'Officer Without Visits', email: 'taskA3.officer2@example.com', password: 'Password123!' });

    const res2 = await fetch(`http://localhost:4000/api/admin/officers/${officer2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data2 = await res2.json();
    console.log('Edge Case 2 Response:', res2.status, data2);

    if (res2.status !== 200 || data2.data?.action !== 'deleted' || data2.data?.deleted !== true) {
      throw new Error(`Edge Case 2 Failed! Expected HTTP 200 deleted status, got: ${JSON.stringify(data2)}`);
    }

    const dbOfficer2 = await db.query('SELECT * FROM users WHERE id = ?', [officer2Id]);
    if (dbOfficer2.length !== 0) {
      throw new Error(`Edge Case 2 DB Verification Failed! User row still exists in DB.`);
    }
    console.log('✅ Edge Case 2 Passed: Officer without visits was HARD DELETED.');

    // ----------------------------------------------------------------------
    // TEST EDGE CASE 3: Already INACTIVE officer with visits
    // ----------------------------------------------------------------------
    console.log('\n--- Testing Edge Case 3: Already INACTIVE officer with visits ---');
    const res3 = await fetch(`http://localhost:4000/api/admin/officers/${officer1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data3 = await res3.json();
    console.log('Edge Case 3 Response:', res3.status, data3);

    if (res3.status !== 200 || data3.data?.action !== 'deactivated' || data3.data?.deactivated !== true) {
      throw new Error(`Edge Case 3 Failed! Expected HTTP 200 deactivated status, got: ${JSON.stringify(data3)}`);
    }
    console.log('✅ Edge Case 3 Passed: Already inactive officer with visits remained deactivated cleanly.');

    // ----------------------------------------------------------------------
    // TEST EDGE CASE 4: Non-existent officer ID -> 404
    // ----------------------------------------------------------------------
    console.log('\n--- Testing Edge Case 4: Non-existent officer ID ---');
    const res4 = await fetch(`http://localhost:4000/api/admin/officers/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data4 = await res4.json();
    console.log('Edge Case 4 Response:', res4.status, data4);

    if (res4.status !== 404 || data4.error !== 'Officer not found') {
      throw new Error(`Edge Case 4 Failed! Expected HTTP 404, got: ${res4.status}`);
    }
    console.log('✅ Edge Case 4 Passed: Non-existent officer returned HTTP 404.');

    // ----------------------------------------------------------------------
    // TEST EDGE CASE 5: Admin account ID -> Preserved (Cannot be deleted)
    // ----------------------------------------------------------------------
    console.log('\n--- Testing Edge Case 5: Admin account ID ---');
    const [adminRow] = await db.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    const adminId = adminRow.id;

    const res5 = await fetch(`http://localhost:4000/api/admin/officers/${adminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data5 = await res5.json();
    console.log('Edge Case 5 Response:', res5.status, data5);

    if (res5.status !== 404 || data5.error !== 'Officer not found') {
      throw new Error(`Edge Case 5 Failed! Expected HTTP 404 protecting ADMIN account, got: ${res5.status}`);
    }

    const [dbAdmin] = await db.query('SELECT role, status FROM users WHERE id = ?', [adminId]);
    if (dbAdmin?.role !== 'ADMIN' || dbAdmin?.status !== 'ACTIVE') {
      throw new Error(`Edge Case 5 DB Verification Failed! Admin account was modified.`);
    }
    console.log('✅ Edge Case 5 Passed: ADMIN account is 100% protected from officer deletion.');

    // ----------------------------------------------------------------------
    // AUDIT LOG VERIFICATION
    // ----------------------------------------------------------------------
    console.log('\n--- Verifying Audit Logs ---');
    const auditDeactivate = await db.query("SELECT * FROM audit_logs WHERE event_type = 'admin.deactivate_officer' AND resource_id = ?", [String(officer1Id)]);
    const auditDelete = await db.query("SELECT * FROM audit_logs WHERE event_type = 'admin.delete_officer' AND resource_id = ?", [String(officer2Id)]);

    console.log(`Deactivate Audit Logs found: ${auditDeactivate.length}`);
    console.log(`Delete Audit Logs found: ${auditDelete.length}`);

    if (auditDeactivate.length === 0 || auditDelete.length === 0) {
      throw new Error('Audit log records missing for delete or deactivate operations!');
    }
    console.log('✅ Audit Log Verification Passed: Event logs recorded cleanly for both actions.');

    // Cleanup
    await db.query(`DELETE FROM visits WHERE officer_id = ?`, [officer1Id]);
    await db.query(`DELETE FROM users WHERE id = ?`, [officer1Id]);
    await db.query(`DELETE FROM visitors WHERE id = ?`, [visitorId]);

    console.log('\n✅ TASK A3 ALL EDGE CASES PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TASK A3 TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTaskA3SafeDeletionTest();
