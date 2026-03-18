import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const results = [];
const created = {
  adminId: null,
  officerId: null,
  visitorId: null,
  visitId: null
};

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
  return { status: res.status, data };
}

async function textRequest(baseUrl, path, { token } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function run() {
  let server;

  try {
    const app = createApp();
    server = await new Promise((resolve) => {
      const started = app.listen(0, () => resolve(started));
    });
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    // Create admin
    const adminEmail = `admin.phase7+${Date.now()}@example.com`;
    const adminPassword = 'AdminTest123!';
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const adminInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      ['Phase7 Admin', adminEmail, adminHash]
    );
    created.adminId = adminInsert.insertId;

    let response = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword }
    });
    record('Admin login', response.status === 200 && response.data?.success === true);
    const adminToken = response.data?.data?.token;

    // Create officer (active)
    const officerEmail = `officer.phase7+${Date.now()}@example.com`;
    const officerHash = await bcrypt.hash('OfficerPass123!', 12);
    const officerInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'OFFICER', 'ACTIVE')`,
      ['Phase7 Officer', officerEmail, officerHash]
    );
    created.officerId = officerInsert.insertId;

    const officerToken = jwt.sign(
      { id: created.officerId, role: 'OFFICER', full_name: 'Phase7 Officer' },
      env.jwt.secret,
      { expiresIn: '5m' }
    );

    // Create visitor and visit
    response = await jsonRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Phase7 Visitor', phone_number: '1234567890', visitor_type: 'BD', code: `P7-${Date.now()}` }
    });
    created.visitorId = response.data?.data?.visitor?.id || null;
    record('Visitor create', response.status === 201);

    response = await jsonRequest(baseUrl, '/visits/checkin', {
      method: 'POST',
      token: officerToken,
      body: { query: response.data?.data?.visitor?.code || '', purpose: 'Phase7', person_to_see: 'Manager' }
    });
    created.visitId = response.data?.data?.visit_id || null;
    record('Check-in', response.status === 201);

    // Dashboard metrics
    response = await jsonRequest(baseUrl, '/reports/dashboard', { token: adminToken });
    record('Dashboard metrics', response.status === 200 && response.data?.success === true);

    // Visitors per day
    response = await jsonRequest(baseUrl, '/reports/visitors-per-day', { token: adminToken });
    record('Visitors per day', response.status === 200 && Array.isArray(response.data?.data));

    // Visitor type distribution
    response = await jsonRequest(baseUrl, '/reports/visitor-types', { token: adminToken });
    record('Visitor type distribution', response.status === 200 && Array.isArray(response.data?.data));

    // Visit history
    response = await jsonRequest(baseUrl, '/visits/history', { token: adminToken });
    record('Visit history', response.status === 200 && Array.isArray(response.data?.data));

    // Visitor history
    response = await jsonRequest(baseUrl, `/visitors/${created.visitorId}/history`, { token: adminToken });
    record('Visitor history', response.status === 200 && Array.isArray(response.data?.data));

    // Export CSV
    const exportRes = await textRequest(baseUrl, '/visits/export?format=csv', { token: adminToken });
    record('Export CSV', exportRes.status === 200 && exportRes.text.includes('visit_id'));

    // Checkout
    response = await jsonRequest(baseUrl, `/visits/${created.visitId}/checkout`, { method: 'PUT', token: officerToken });
    record('Check-out', response.status === 200);
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

console.log('Phase 7 test results');
for (const test of results) {
  const status = test.ok ? 'PASS' : 'FAIL';
  console.log(`${status}: ${test.name}${test.details ? ` (${test.details})` : ''}`);
}

const failed = results.filter((test) => !test.ok);
if (failed.length) {
  process.exitCode = 1;
}
