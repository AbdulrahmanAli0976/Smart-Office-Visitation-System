import { db } from '../src/config/db.js';

async function runTaskA1JwtRevocationTest() {
  console.log('--- Starting Task A1 End-to-End Test: Server-Side JWT Revocation & Blacklisting ---');

  try {
    // 1. Login to obtain active JWT token
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aliyakubuabdulrahman@gmail.com', password: '@SmartStrongSystem2026' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;

    if (!token) {
      throw new Error(`Failed to obtain JWT token on login: ${JSON.stringify(loginData)}`);
    }
    console.log('Step 1: Authenticated successfully. Token obtained.');

    // 2. Verify active token works on protected endpoint
    const activeRes = await fetch('http://localhost:4000/api/visitors?page=1&limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Step 2: Active token request status: ${activeRes.status} (Expected 200)`);
    if (activeRes.status !== 200) {
      throw new Error(`Active token request failed with status ${activeRes.status}`);
    }

    // 3. Perform Server-Side Logout (Revoke Token)
    const logoutRes = await fetch('http://localhost:4000/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const logoutData = await logoutRes.json();
    console.log(`Step 3: Logout endpoint status: ${logoutRes.status}, Response:`, logoutData);
    if (logoutRes.status !== 200 || logoutData.success !== true) {
      throw new Error(`Logout endpoint failed: ${JSON.stringify(logoutData)}`);
    }

    // 4. Verify Revoked Token is Rejected by Backend
    const revokedRes = await fetch('http://localhost:4000/api/visitors?page=1&limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const revokedData = await revokedRes.json();
    console.log(`Step 4: Post-logout request status: ${revokedRes.status} (Expected 401), Response:`, revokedData);

    if (revokedRes.status !== 401 || revokedData.error !== 'Token has been revoked') {
      throw new Error(`CRITICAL SECURITY FAILURE: Revoked token was NOT rejected with 'Token has been revoked'! Response: ${JSON.stringify(revokedData)}`);
    }

    // 5. Verify database token_blacklist record
    const blacklistRows = await db.query('SELECT * FROM token_blacklist WHERE token = ?', [token]);
    console.log(`Step 5: Database token_blacklist record count: ${blacklistRows.length}`);
    if (blacklistRows.length !== 1) {
      throw new Error('Token record not found in token_blacklist MySQL table!');
    }

    console.log('\n✅ TASK A1 END-TO-END VERIFICATION PASSED: Server-side token revocation and database blacklisting are 100% functional!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TASK A1 VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTaskA1JwtRevocationTest();
