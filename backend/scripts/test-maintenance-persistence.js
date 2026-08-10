import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const results = [];
const created = { adminId: null, officerId: null };

function record(name, ok, details = '') {
  results.push({ name, ok, details });
}

async function jsonRequest(baseUrl, path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function run() {
  let server;

  try {
    const app = createApp();
    server = await new Promise((resolve) => {
      const started = app.listen(0, () => resolve(started));
    });
    const { port } = server.address();
    const apiHost = process.env.API_HOST || 'backend';
    const baseUrl = `http://${apiHost}:${port}/api`;

    // 1. Create temporary ADMIN user
    const adminEmail = `admin.persist+${Date.now()}@example.com`;
    const adminPassword = 'AdminPersist123!';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const adminInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      ['Admin Persistence QA', adminEmail, adminHash]
    );
    created.adminId = adminInsert.insertId;

    // 2. Create temporary OFFICER user
    const officerEmail = `officer.persist+${Date.now()}@example.com`;
    const officerPassword = 'OfficerPersist123!';
    const officerHash = await bcrypt.hash(officerPassword, 12);

    const officerInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'OFFICER', 'ACTIVE')`,
      ['Officer Persistence QA', officerEmail, officerHash]
    );
    created.officerId = officerInsert.insertId;

    // 3. Admin login before maintenance
    const adminLoginRes = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword }
    });
    const adminToken = adminLoginRes.data?.data?.token;
    record('ADMIN login before maintenance succeeds', adminLoginRes.status === 200 && Boolean(adminToken));

    // 4. Officer login before maintenance
    const officerLoginRes = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: officerPassword }
    });
    const preMaintOfficerToken = officerLoginRes.data?.data?.token;
    record('OFFICER login before maintenance succeeds', officerLoginRes.status === 200 && Boolean(preMaintOfficerToken));

    // 5. Enable maintenance mode as ADMIN
    const enableMaintRes = await jsonRequest(baseUrl, '/admin/maintenance', {
      method: 'POST',
      token: adminToken,
      body: { enabled: true, message: 'Scheduled system maintenance in progress.' }
    });
    record('ADMIN enable maintenance succeeds', enableMaintRes.status === 200 && enableMaintRes.data?.data?.maintenance === true);

    // 6. Public maintenance status endpoint
    const publicMaintRes = await jsonRequest(baseUrl, '/system/maintenance');
    const publicData = publicMaintRes.data?.data || publicMaintRes.data;
    record('Public maintenance status endpoint returns active state', publicMaintRes.status === 200 && publicData?.maintenance === true);

    // 7. ADMIN API access works during maintenance
    const adminDashboardRes = await jsonRequest(baseUrl, '/reports/dashboard', { token: adminToken });
    record('ADMIN API access works during maintenance', adminDashboardRes.status === 200 && adminDashboardRes.data?.success === true);

    // 8. OFFICER login is blocked during maintenance (HTTP 503)
    const officerLoginDuringRes = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: officerPassword }
    });
    record('OFFICER login blocked during maintenance (HTTP 503)', officerLoginDuringRes.status === 503 && officerLoginDuringRes.data?.maintenance === true);

    // 9. Existing OFFICER token revoked (HTTP 503 or 401)
    const preMaintTokenUse = await jsonRequest(baseUrl, '/visits/active', { token: preMaintOfficerToken });
    record('Existing OFFICER token revoked during maintenance', preMaintTokenUse.status === 503 || preMaintTokenUse.status === 401);

    // 10. Disable maintenance mode as ADMIN
    const disableMaintRes = await jsonRequest(baseUrl, '/admin/maintenance', {
      method: 'POST',
      token: adminToken,
      body: { enabled: false }
    });
    record('ADMIN disable maintenance succeeds', disableMaintRes.status === 200 && disableMaintRes.data?.data?.maintenance === false);

    // 11. OFFICER login succeeds after maintenance disabled
    const officerLoginAfterRes = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: officerPassword }
    });
    const postMaintOfficerToken = officerLoginAfterRes.data?.data?.token;
    record('OFFICER login succeeds after maintenance disabled', officerLoginAfterRes.status === 200 && Boolean(postMaintOfficerToken));

    // 12. Newly issued OFFICER token works normally
    const postMaintTokenUse = await jsonRequest(baseUrl, '/visits/active', { token: postMaintOfficerToken });
    record('Fresh OFFICER token works after maintenance disabled', postMaintTokenUse.status === 200);

  } catch (err) {
    record('Unexpected error during test execution', false, err.message);
  } finally {
    // Ensure maintenance mode is reset to disabled
    try {
      await db.query(`UPDATE system_settings SET setting_value = 'false' WHERE setting_key = 'maintenance_mode'`);
    } catch (_) {}

    if (created.officerId) {
      await db.query('DELETE FROM users WHERE id = ?', [created.officerId]);
    }
    if (created.adminId) {
      await db.query('DELETE FROM users WHERE id = ?', [created.adminId]);
    }

    if (server) {
      server.close();
    }
    await db.pool.end();
  }
}

await run();

console.log('--- Maintenance Flow & Policy Results ---');
for (const test of results) {
  console.log(`${test.ok ? 'PASS' : 'FAIL'}: ${test.name}${test.details ? ` (${test.details})` : ''}`);
}
const failures = results.filter((test) => !test.ok);
if (failures.length) {
  process.exitCode = 1;
}
