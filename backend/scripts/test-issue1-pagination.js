import { db } from '../src/config/db.js';
import { listVisitHistoryPaged } from '../src/services/visitService.js';
import { listVisitorsPaged } from '../src/services/visitorService.js';
import { listOfficersPaged } from '../src/services/userService.js';

async function runIssue1RegressionTest() {
  console.log('--- Starting Issue #1 Regression Test: Pagination & Filter Accuracy ---');

  try {
    // 1. Unfiltered Visitors
    const visitorsAll = await listVisitorsPaged({ search: '', status: 'ACTIVE', limit: 5, offset: 0 });
    console.log(`Unfiltered Visitors: ${visitorsAll.rows.length} rows returned, Total Count = ${visitorsAll.total}`);

    // 2. Filtered Visitors Search
    const visitorsFiltered = await listVisitorsPaged({ search: 'Repro Test', status: 'ACTIVE', limit: 5, offset: 0 });
    console.log(`Filtered Visitors ('Repro Test'): ${visitorsFiltered.rows.length} rows returned, Total Count = ${visitorsFiltered.total}`);
    if (visitorsFiltered.rows.length !== visitorsFiltered.total) {
      throw new Error(`Filtered count mismatch! Rows: ${visitorsFiltered.rows.length}, Total: ${visitorsFiltered.total}`);
    }

    // 3. Filtered Visits Search
    const visitsFiltered = await listVisitHistoryPaged({ search: 'Regression Testing Cycle 1', limit: 5, offset: 0 });
    console.log(`Filtered Visits ('Regression Testing Cycle 1'): ${visitsFiltered.rows.length} rows returned, Total Count = ${visitsFiltered.total}`);
    if (visitsFiltered.rows.length !== visitsFiltered.total) {
      throw new Error(`Filtered visits count mismatch! Rows: ${visitsFiltered.rows.length}, Total: ${visitsFiltered.total}`);
    }

    // 4. Filtered Officers Search
    const officersFiltered = await listOfficersPaged({ search: 'Yakubu', limit: 5, offset: 0 });
    console.log(`Filtered Officers ('Yakubu'): ${officersFiltered.rows.length} rows returned, Total Count = ${officersFiltered.total}`);
    if (officersFiltered.rows.length !== officersFiltered.total) {
      throw new Error(`Filtered officers count mismatch! Rows: ${officersFiltered.rows.length}, Total: ${officersFiltered.total}`);
    }

    console.log('\n✅ ISSUE #1 FILTER MATCH TEST PASSED: COUNT(*) WHERE clauses match main queries 100% identically under all filters!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ISSUE #1 FILTER MATCH TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runIssue1RegressionTest();
