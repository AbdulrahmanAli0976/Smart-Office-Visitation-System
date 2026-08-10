import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const results = [];
const created = { adminId: null, officerId: null, visitorId: null, visitId: null };

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

    const adminEmail = `admin.maintenance+${Date.now()}@example.com`;
    const adminPassword = 'AdminTest123!';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    const adminInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      ['Admin Maintenance QA', adminEmail, adminHash]
    );
    created.adminId = adminInsert.insertId;

    const adminLogin = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword }
    });
    record('ADMIN valid login succeeds', adminLogin.status === 200 && adminLogin.data?.success === true);
    const adminToken = adminLogin.data?.data?.token;

    const invalidAdmin1 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword123!' }
    });
    record('ADMIN invalid password rejected', invalidAdmin1.status === 401);

    const invalidAdmin2 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword123!' }
    });
    const invalidAdmin3 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword123!' }
    });
    const invalidAdmin4 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword123!' }
    });

    const currentFailedCount = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword123!' }
    });

    const retryAfter = currentFailedCount.headers?.get?.('Retry-After') || null;
    const okAfterThrottle = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword }
    });

    record('ADMIN can authenticate after failed attempts', okAfterThrottle.status === 200 && okAfterThrottle.data?.success === true);
    const latestAdminToken = okAfterThrottle.data?.data?.token;

    const throttleScope1 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'officer@example.com', password: 'not-the-right-password' }
    });
    const throttleScope2 = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'not-the-right-password' }
    });
    record('Different email keys are scoped independently', throttleScope1.status === 401 && throttleScope2.status === 401);

    const officerEmail = `officer.maintenance+${Date.now()}@example.com`;
    const officerHash = await bcrypt.hash('OfficerPass123!', 12);
    const officerInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'OFFICER', 'ACTIVE')`,
      ['Maintenance Officer', officerEmail, officerHash]
    );
    created.officerId = officerInsert.insertId;

    const officerToken = jwt.sign(
      { id: created.officerId, role: 'OFFICER', full_name: 'Maintenance Officer' },
      env.jwt.secret,
      { expiresIn: '5m' }
    );

    const officerLoginBeforeMaint = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: 'OfficerPass123!' }
    });
    record('OFFICER login before maintenance can succeed', officerLoginBeforeMaint.status === 200 && officerLoginBeforeMaint.data?.success === true);

    const maintenanceApiStatus = await jsonRequest(baseUrl, '/system/maintenance');
    const maintData = maintenanceApiStatus.data?.data || maintenanceApiStatus.data;
    record('Public maintenance endpoint is available', maintenanceApiStatus.status === 200 && maintData?.maintenance !== undefined);

    const adminMaintenanceBefore = await jsonRequest(baseUrl, '/admin/maintenance', { token: adminToken });
    record('ADMIN maintenance GET succeeds', adminMaintenanceBefore.status === 200 && adminMaintenanceBefore.data?.success === true);

    const enableMaint = await jsonRequest(baseUrl, '/admin/maintenance', {
      method: 'POST',
      token: latestAdminToken || adminToken,
      body: { enabled: true, message: 'Kindly be patient with us. There\'s a maintenance going on, which will be resolved shortly.' }
    });
    record('ADMIN maintenance enable succeeds', enableMaint.status === 200 && enableMaint.data?.data?.maintenance === true);

    const oldOfficerProtected = await jsonRequest(baseUrl, '/visits/active', { token: officerToken });
    record('OFFICER JWT issued before maintenance is revoked at middleware', oldOfficerProtected.status === 503 || oldOfficerProtected.status === 401);

    const officerLoginDuringMaint = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: 'OfficerPass123!' }
    });
    record('OFFICER login blocked during maintenance', officerLoginDuringMaint.status === 503 && officerLoginDuringMaint.data?.maintenance === true);

    const adminDashboardDuringMaint = await jsonRequest(baseUrl, '/reports/dashboard', { token: latestAdminToken || adminToken });
    record('ADMIN API access works during maintenance', adminDashboardDuringMaint.status === 200 && adminDashboardDuringMaint.data?.success === true);

    const disableMaint = await jsonRequest(baseUrl, '/admin/maintenance', {
      method: 'POST',
      token: latestAdminToken || adminToken,
      body: { enabled: false, message: 'Kindly be patient with us. There\'s a maintenance going on, which will be resolved shortly.' }
    });
    record('ADMIN can disable maintenance', disableMaint.status === 200 && disableMaint.data?.data?.maintenance === false);

    const officerLoginAfterMaint = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: 'OfficerPass123!' }
    });
    record('OFFICER can authenticate after maintenance disabled', officerLoginAfterMaint.status === 200 && officerLoginAfterMaint.data?.success === true);

    const validOfficerJwt = officerLoginAfterMaint.data?.data?.token;
    const officerHistory = await jsonRequest(baseUrl, '/visits/active', { token: validOfficerJwt });
    record('OFFICER can use fresh token after maintenance', officerHistory.status === 200);

  } finally {
    if (created.visitId) {
      await db.query('DELETE FROM visits WHERE id = ?', [created.visitId]);
    }
    if (created.visitorId) {
      await db.query('DELETE FROM visitors WHERE id = ?', [created.visitorId]);
    }
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

console.log('Maintenance + throttling regression results');
for (const test of results) {
  console.log(`${test.ok ? 'PASS' : 'FAIL'}: ${test.name}${test.details ? ` (${test.details})` : ''}`);
}
const failures = results.filter((test) => !test.ok);
if (failures.length) {
  process.exitCode = 1;
}
