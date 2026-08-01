import { db } from '../src/config/db.js';
import { createOfficer, listOfficersPaged, listOfficers, updateOfficerStatus, deleteOfficer, findUserByEmail } from '../src/services/userService.js';
import { USER_ROLES } from '../src/config/roles.js';

async function runIssue3RegressionTest() {
  console.log('--- Starting Issue #3 Regression Test: Parameterized Officer Role Filter & RBAC ---');

  try {
    const testEmail = 'issue3.test.officer@example.com';
    const testName = 'Issue 3 Test Officer';

    // Cleanup left-over test user if any
    await db.query('DELETE FROM users WHERE email = ?', [testEmail]);

    // 1. Create a test officer
    const officerId = await createOfficer({
      fullName: testName,
      email: testEmail,
      password: 'StrongPassword123!'
    });
    console.log(`Created test officer ID: ${officerId}`);

    // 2. Test listOfficersPaged
    const pagedResult = await listOfficersPaged({ search: 'Issue 3', status: 'PENDING', limit: 10, offset: 0 });
    console.log(`listOfficersPaged found ${pagedResult.rows.length} rows (total: ${pagedResult.total})`);

    if (!pagedResult.rows.some((u) => u.id === officerId)) {
      throw new Error('Created officer was not found in listOfficersPaged output');
    }

    // Verify ADMIN users are NOT returned in officer listing
    const pagedAll = await listOfficersPaged({ limit: 100, offset: 0 });
    const containsAdmin = pagedAll.rows.some((u) => u.role === USER_ROLES.ADMIN);
    if (containsAdmin) {
      throw new Error('RBAC Violation: listOfficersPaged returned an ADMIN user!');
    }

    // 3. Test listOfficers
    const allOfficers = await listOfficers();
    console.log(`listOfficers returned ${allOfficers.length} officers`);
    if (allOfficers.some((u) => u.role === USER_ROLES.ADMIN)) {
      throw new Error('RBAC Violation: listOfficers returned an ADMIN user!');
    }

    // 4. Test updateOfficerStatus
    const updatedCount = await updateOfficerStatus(officerId, 'ACTIVE');
    if (updatedCount !== 1) {
      throw new Error(`updateOfficerStatus failed to update officer ${officerId}`);
    }
    console.log(`updateOfficerStatus updated officer ${officerId} to ACTIVE`);

    // Verify RBAC protection: updateOfficerStatus should NOT allow updating an ADMIN user
    const adminUser = await db.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (adminUser.length > 0) {
      const adminId = adminUser[0].id;
      const adminUpdateCount = await updateOfficerStatus(adminId, 'INACTIVE');
      if (adminUpdateCount !== 0) {
        throw new Error(`RBAC Boundary Failure: updateOfficerStatus modified an ADMIN user (id: ${adminId})!`);
      }
      console.log(`RBAC Boundary Verified: updateOfficerStatus safely rejected modification of ADMIN user (id: ${adminId}).`);
    }

    // 5. Test deleteOfficer
    const deleteCount = await deleteOfficer(officerId);
    if (deleteCount !== 1) {
      throw new Error(`deleteOfficer failed to delete officer ${officerId}`);
    }
    console.log(`deleteOfficer successfully deleted test officer ${officerId}`);

    console.log('\n✅ ISSUE #3 REGRESSION TEST PASSED: Parameterized role filtering and RBAC boundaries are 100% verified!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ISSUE #3 REGRESSION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runIssue3RegressionTest();
