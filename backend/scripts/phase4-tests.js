import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const results = [];
const created = {
  adminId: null,
  officerId: null,
  inactiveOfficerId: null,
  bulkPhones: [],
  visitorIds: [],
  visitIds: []
};

function record(name, ok, details = '') {
  results.push({ name, ok, details });
}

async function rawRequest(baseUrl, path, { method = 'GET', body, token } = {}) {
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

async function run() {
  let server;

  try {
    const app = createApp();
    server = await new Promise((resolve) => {
      const started = app.listen(0, () => resolve(started));
    });
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api`;

    // Create admin user directly
    const adminEmail = `admin.test+${Date.now()}@example.com`;
    const adminPassword = 'AdminTest123!';
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const adminInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      ['Test Admin', adminEmail, adminHash]
    );
    created.adminId = adminInsert.insertId;

    // Login as admin
    let response = await rawRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword }
    });
    record('Admin login', response.status === 200 && response.data?.success === true);
    const adminToken = response.data?.data?.token;

    // Admin can perform visit actions
    const adminVisitorCode = `ADMIN-${Date.now()}`;
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: adminToken,
      body: { full_name: 'Admin Visitor', phone_number: `700${Date.now()}`, visitor_type: 'BD', code: adminVisitorCode }
    });
    const adminVisitor = response.data?.data?.visitor;
    if (adminVisitor?.id) created.visitorIds.push(adminVisitor.id);
    record('Admin create visitor', response.status === 201 && response.data?.success === true);

    response = await rawRequest(baseUrl, '/visits/checkin', {
      method: 'POST',
      token: adminToken,
      body: { query: adminVisitorCode, purpose: 'Admin visit', person_to_see: 'Reception' }
    });
    const adminVisitId = response.data?.data?.visit_id;
    if (adminVisitId) created.visitIds.push(adminVisitId);
    record('Admin check-in allowed', response.status === 201 && response.data?.success === true);

    if (!adminVisitId) {
      record('Admin check-out allowed', false, 'Missing admin visit id');
    } else {
      response = await rawRequest(baseUrl, `/visits/${adminVisitId}/checkout`, { method: 'PUT', token: adminToken });
      record('Admin check-out allowed', response.status === 200 && response.data?.data?.status === 'COMPLETED');
    }

    // Officer registration
    const officerEmail = `officer.test+${Date.now()}@example.com`;
    const officerPassword = 'OfficerTest123!';
    response = await rawRequest(baseUrl, '/auth/register', {
      method: 'POST',
      body: { full_name: 'Test Officer', email: officerEmail, password: officerPassword }
    });
    record('Officer registration (PENDING)', response.status === 201 && response.data?.data?.status === 'PENDING');

    // Officer login before approval
    response = await rawRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: officerPassword }
    });
    record('Officer login blocked before approval', response.status === 403 && response.data?.success === false);

    // Admin approval
    response = await rawRequest(baseUrl, '/admin/officers', { token: adminToken });
    const officers = response.data?.data || [];
    const officer = officers.find((item) => item.email === officerEmail);
    created.officerId = officer?.id || null;
    response = await rawRequest(baseUrl, `/admin/officers/${created.officerId}/approve`, {
      method: 'PUT',
      token: adminToken
    });
    record('Admin approval', response.status === 200 && response.data?.data?.status === 'ACTIVE');

    // Officer login after approval
    response = await rawRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: officerEmail, password: officerPassword }
    });
    record('Officer login after approval', response.status === 200 && response.data?.success === true);
    const officerToken = response.data?.data?.token;

    // Visitor validation: missing code
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Visitor One', phone_number: '1111111111', visitor_type: 'BD', code: '' }
    });
    record('Visitor validation: missing code', response.status === 400);

    // Visitor validation: agent must not have code
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Visitor Two', phone_number: '2222222222', visitor_type: 'AGENT_MERCHANT', code: 'BAD' }
    });
    record('Visitor validation: agent with code', response.status === 400);

    // Visitor create
    const testCode = `TEST-${Date.now()}`;
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Visitor Three', phone_number: '3333333333', visitor_type: 'BD', code: testCode }
    });
    const createdVisitor = response.data?.data?.visitor;
    if (createdVisitor?.id) created.visitorIds.push(createdVisitor.id);
    record('Visitor create', response.status === 201 && response.data?.success === true);

    // Duplicate code
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Visitor Four', phone_number: '4444444444', visitor_type: 'BD', code: testCode }
    });
    record('Duplicate code blocked', response.status === 409);

    // Duplicate phone detection
    response = await rawRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: officerToken,
      body: { full_name: 'Visitor Three Alt', phone_number: '3333333333', visitor_type: 'MS', code: `TEST2-${Date.now()}` }
    });
    const dupVisitor = response.data?.data?.visitor;
    if (dupVisitor?.id) created.visitorIds.push(dupVisitor.id);
    record('Duplicate phone warning', response.status === 201 && (response.data?.data?.duplicates || []).length > 0);

    // Smart search priority
    response = await rawRequest(baseUrl, `/visitors/search?q=${encodeURIComponent(testCode)}`, { token: officerToken });
    const searchResults = response.data?.data || [];
    record('Smart search by code priority', response.status === 200 && searchResults[0]?.priority === 0);

    // Check-in with query
    response = await rawRequest(baseUrl, '/visits/checkin', {
      method: 'POST',
      token: officerToken,
      body: { query: testCode, purpose: 'Test visit', person_to_see: 'Test Person' }
    });
    const visitId = response.data?.data?.visit_id;
    if (visitId) created.visitIds.push(visitId);
    record('Check-in flow', response.status === 201 && response.data?.success === true);

    // Duplicate check-in blocked
    response = await rawRequest(baseUrl, '/visits/checkin', {
      method: 'POST',
      token: officerToken,
      body: { query: testCode, purpose: 'Test visit', person_to_see: 'Test Person' }
    });
    record('Duplicate check-in blocked', response.status === 409);

    // Active visits
    response = await rawRequest(baseUrl, '/visits/active', { token: officerToken });
    const activeVisits = response.data?.data || [];
    record('Active visits listed', response.status === 200 && activeVisits.some((v) => v.visit_id === visitId));

    // Check-out
    response = await rawRequest(baseUrl, `/visits/${visitId}/checkout`, { method: 'PUT', token: officerToken });
    record('Check-out flow', response.status === 200 && response.data?.data?.status === 'COMPLETED');

    // Active visits cleared
    response = await rawRequest(baseUrl, '/visits/active', { token: officerToken });
    const activeAfter = response.data?.data || [];
    record('Active visits after checkout', response.status === 200 && !activeAfter.some((v) => v.visit_id === visitId));

    // Bulk check-in/out
    const bulkCodeBase = `BULK-${Date.now()}`;
    const bulkPhones = [`800${Date.now()}1`, `800${Date.now()}2`];
    created.bulkPhones.push(...bulkPhones);
    response = await rawRequest(baseUrl, '/visits/bulk-checkin', {
      method: 'POST',
      token: officerToken,
      body: {
        visitors: [
          { full_name: 'Bulk Visitor One', phone: bulkPhones[0], type: 'BD', code: `${bulkCodeBase}-1` },
          { full_name: 'Bulk Visitor Two', phone: bulkPhones[1], type: 'AGG', code: `${bulkCodeBase}-2` }
        ]
      }
    });
    record('Bulk check-in', response.status === 200 && response.data?.success === true);

    const bulkRows = await db.query('SELECT id FROM visitors WHERE phone_number IN (?, ?)', bulkPhones);
    for (const row of bulkRows) {
      created.visitorIds.push(row.id);
    }

    response = await rawRequest(baseUrl, '/visits/active', { token: officerToken });
    const bulkActive = response.data?.data || [];
    const bulkVisitIds = bulkActive.filter((v) => bulkPhones.includes(v.phone_number)).map((v) => v.visit_id);
    if (bulkVisitIds.length) created.visitIds.push(...bulkVisitIds);

    if (bulkVisitIds.length === 0) {
      record('Bulk check-out', false, 'No bulk visits found');
    } else {
      response = await rawRequest(baseUrl, '/visits/bulk-checkout', {
        method: 'POST',
        token: officerToken,
        body: { visitIds: bulkVisitIds }
      });
      record('Bulk check-out', response.status === 200 && response.data?.updated === bulkVisitIds.length);
    }

    // Invalid checkout id
    response = await rawRequest(baseUrl, '/visits/9999999/checkout', { method: 'PUT', token: officerToken });
    record('Invalid checkout id', response.status === 404);

    // Protected route requires auth
    response = await rawRequest(baseUrl, '/visits/active');
    record('Protected route requires auth', response.status === 401);

    // Inactive officer check
    const inactiveEmail = `inactive.test+${Date.now()}@example.com`;
    const inactiveInsert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'OFFICER', 'INACTIVE')`,
      ['Inactive Officer', inactiveEmail, 'x']
    );
    created.inactiveOfficerId = inactiveInsert.insertId;
    const inactiveToken = jwt.sign(
      { id: created.inactiveOfficerId, role: 'OFFICER', full_name: 'Inactive Officer' },
      env.jwt.secret,
      { expiresIn: '5m' }
    );
    response = await rawRequest(baseUrl, '/visits/checkin', {
      method: 'POST',
      token: inactiveToken,
      body: {
        query: '',
        purpose: 'Test',
        person_to_see: 'Test',
        visitor: {
          full_name: 'Inactive Visitor',
          phone_number: '9999999999',
          visitor_type: 'BD',
          code: `INACTIVE-${Date.now()}`
        }
      }
    });
    record('Inactive officer blocked', response.status === 403);

    // Pagination checks
    response = await rawRequest(baseUrl, '/visitors?page=1&limit=1', { token: adminToken });
    record('Visitors pagination', response.status === 200 && response.data?.pagination && response.data?.meta);

    response = await rawRequest(baseUrl, '/visits?page=1&limit=5', { token: adminToken });
    record('Visits pagination', response.status === 200 && response.data?.pagination && response.data?.meta);
  } finally {
    // Cleanup test data
    for (const visitId of created.visitIds) {
      await db.query('DELETE FROM visits WHERE id = ?', [visitId]);
    }
    for (const visitorId of created.visitorIds) {
      await db.query('DELETE FROM visitors WHERE id = ?', [visitorId]);
    }
    if (created.officerId) {
      await db.query('DELETE FROM users WHERE id = ?', [created.officerId]);
    }
    if (created.inactiveOfficerId) {
      await db.query('DELETE FROM users WHERE id = ?', [created.inactiveOfficerId]);
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

console.log('Phase 4 test results');
for (const test of results) {
  const status = test.ok ? 'PASS' : 'FAIL';
  console.log(`${status}: ${test.name}${test.details ? ` (${test.details})` : ''}`);
}

const failed = results.filter((test) => !test.ok);
if (failed.length) {
  process.exitCode = 1;
}
