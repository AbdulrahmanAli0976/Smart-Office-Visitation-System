import { db } from '../src/config/db.js';

async function runTaskB1TimeoutTest() {
  console.log('--- Starting Task B1 Test: Health Check & Query Timeout Verification ---');

  try {
    // 1. Test normal query with timeout
    const rows = await db.queryWithTimeout('SELECT 1 as val', [], 2000);
    if (rows[0]?.val !== 1) {
      throw new Error('Normal query with timeout failed');
    }
    console.log('Step 1 Passed: Fast query with timeout succeeded.');

    // 2. Test timing out on a sleeping query
    let caughtTimeoutError = false;
    const start = Date.now();
    try {
      await db.queryWithTimeout('SELECT SLEEP(3)', [], 300);
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`Step 2: Caught expected timeout error after ${elapsed}ms:`, err.message);
      if (err.message.includes('timed out')) {
        caughtTimeoutError = true;
      }
    }

    if (!caughtTimeoutError) {
      throw new Error('Slow query did NOT trigger a timeout error!');
    }
    console.log('Step 2 Passed: Timeout mechanism enforced correctly.');

    // 3. Test HTTP /api/health endpoint
    const healthRes = await fetch('http://localhost:4000/api/health');
    const healthData = await healthRes.json();
    console.log('Step 3: /api/health status:', healthRes.status, healthData);

    if (healthRes.status !== 200 || healthData.status !== 'OK') {
      throw new Error('Health check endpoint failed!');
    }
    console.log('Step 3 Passed: Health check API operational.');

    console.log('\n✅ TASK B1 PASSED: Real query timeout and health check verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TASK B1 TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTaskB1TimeoutTest();
