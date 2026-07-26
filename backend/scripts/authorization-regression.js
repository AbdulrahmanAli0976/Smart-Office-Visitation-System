import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const results = [];
const created = {
  users: [],
  visitors: [],
  visits: []
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

async function createUser({ fullName, email, password, role, status }) {
  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName, email, hash, role, status]
  );
  created.users.push({ id: result.insertId, email, role, status });
  return { id: result.insertId, email, password, role, status };
}

function adminRole(role) {
  return role === 'ADMIN';
}

const ROLES = [
  { role: 'ADMIN', label: 'Admin' },
  { role: 'OFFICER', label: 'Officer' }
];

async function run() {
  let server;
  try {
    const app = createApp();
    server = await new Promise((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const users = {};
    for (const { role, label } of ROLES) {
      const email = `${role.toLowerCase()}+auth-test-${Date.now()}@example.com`;
      const password = `Test${role}123!`;
      users[role] = await createUser({
        fullName: `${label} Regression`,
        email,
        password,
        role,
        status: 'ACTIVE'
      });
    }

    const inactiveOfficer = await createUser({
      fullName: 'Inactive Officer Regression',
      email: `inactive.officer+auth-test-${Date.now()}@example.com`,
      password: 'TestInactive123!',
      role: 'OFFICER',
      status: 'INACTIVE'
    });

    const deletableOfficer = await createUser({
      fullName: 'Deletable Officer Regression',
      email: `deletable.officer+auth-test-${Date.now()}@example.com`,
      password: 'TestDelete123!',
      role: 'OFFICER',
      status: 'ACTIVE'
    });

    const authTokens = {};
    for (const { role } of ROLES) {
      const response = await jsonRequest(baseUrl, '/auth/login', {
        method: 'POST',
        body: { email: users[role].email, password: users[role].password }
      });
      record(`${role} login`, response.status === 200 && Boolean(response.data?.data?.token), `${response.status} ${JSON.stringify(response.data)}`);
      authTokens[role] = response.data?.data?.token;
    }

    const inactiveLogin = await jsonRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: inactiveOfficer.email, password: inactiveOfficer.password }
    });
    record('Inactive officer login blocked', inactiveLogin.status === 403, `${inactiveLogin.status} ${JSON.stringify(inactiveLogin.data)}`);

    const manualInactiveToken = jwt.sign(
      { id: inactiveOfficer.id, email: inactiveOfficer.email, role: inactiveOfficer.role, status: inactiveOfficer.status },
      env.jwt.secret,
      { expiresIn: '5m' }
    );

    const noTokenResponse = await jsonRequest(baseUrl, '/visitors');
    record('Protected route requires token', noTokenResponse.status === 401, `${noTokenResponse.status}`);

    const inactiveOfficerResponse = await jsonRequest(baseUrl, '/visitors', {
      method: 'POST',
      token: manualInactiveToken,
      body: {
        full_name: 'Inactive Visitor',
        phone_number: '1000000001',
        visitor_type: 'BD',
        code: `INACTIVE-${Date.now()}`
      }
    });
    record('Inactive officer blocked from visitor create', inactiveOfficerResponse.status === 403, `${inactiveOfficerResponse.status}`);

    for (const { role } of ROLES) {
      const token = authTokens[role];
      const canAdmin = adminRole(role);
      const rolePrefix = role.replace('_', '-').toLowerCase();
      const visitorCode = `${rolePrefix}-visitor-${Date.now()}`;

      const createVisitorResponse = await jsonRequest(baseUrl, '/visitors', {
        method: 'POST',
        token,
        body: {
          full_name: `${role} Visitor`,
          phone_number: `900${Date.now().toString().slice(-7)}`,
          visitor_type: 'BD',
          code: visitorCode
        }
      });
      const visitorCreated = createVisitorResponse.status === 201 && Boolean(createVisitorResponse.data?.data?.id);
      const visitorId = createVisitorResponse.data?.data?.id;
      if (visitorId) created.visitors.push(visitorId);
      record(`${role} create visitor`, visitorCreated, `${createVisitorResponse.status}`);

      if (visitorCreated) {
        const updateResponse = await jsonRequest(baseUrl, `/visitors/${visitorId}`, {
          method: 'PUT',
          token,
          body: {
            full_name: `${role} Visitor Edited`,
            phone_number: createVisitorResponse.data.data.phone_number,
            visitor_type: 'BD',
            code: visitorCode
          }
        });
        record(`${role} edit visitor`, updateResponse.status === 200 && updateResponse.data?.success === true, `${updateResponse.status}`);
      }

      const checkinResponse = await jsonRequest(baseUrl, '/visits/checkin', {
        method: 'POST',
        token,
        body: {
          query: visitorCode,
          purpose: `${role} Check-in`,
          person_to_see: 'Reception'
        }
      });
      const visitId = checkinResponse.data?.data?.visit_id;
      if (visitId) created.visits.push(visitId);
      record(`${role} check-in`, checkinResponse.status === 201 && Boolean(visitId), `${checkinResponse.status}`);

      if (visitId) {
        const checkoutResponse = await jsonRequest(baseUrl, `/visits/${visitId}/checkout`, {
          method: 'PUT',
          token
        });
        record(`${role} check-out`, checkoutResponse.status === 200 && checkoutResponse.data?.success === true, `${checkoutResponse.status}`);
      }

      const summaryResponse = await jsonRequest(baseUrl, '/reports/summary', { token });
      record(`${role} view reports summary`, summaryResponse.status === 200 && summaryResponse.data?.success === true, `${summaryResponse.status}`);

      const visitorsPerDay = await jsonRequest(baseUrl, '/reports/visitors-per-day', { token });
      record(`${role} view visitors-per-day`, visitorsPerDay.status === 200 && visitorsPerDay.data?.success === true, `${visitorsPerDay.status}`);

      const visitorTypes = await jsonRequest(baseUrl, '/reports/visitor-types', { token });
      record(`${role} view visitor-types`, visitorTypes.status === 200 && visitorTypes.data?.success === true, `${visitorTypes.status}`);

      const dashboardResponse = await jsonRequest(baseUrl, '/reports/dashboard', { token });
      record(`${role} view admin dashboard`, canAdmin ? dashboardResponse.status === 200 : dashboardResponse.status === 403, `${dashboardResponse.status}`);

      const adminListResponse = await jsonRequest(baseUrl, '/admin/officers', { token });
      record(`${role} access admin user management`, canAdmin ? adminListResponse.status === 200 : adminListResponse.status === 403, `${adminListResponse.status}`);
    }

    const adminDeleteResponse = await jsonRequest(baseUrl, `/admin/officers/${deletableOfficer.id}`, {
      method: 'DELETE',
      token: authTokens.ADMIN
    });
    record('ADMIN delete officer', adminDeleteResponse.status === 200 && adminDeleteResponse.data?.success === true, `${adminDeleteResponse.status}`);

    const officerToken = authTokens.OFFICER;
    const officerDeleteAttempt = await jsonRequest(baseUrl, `/admin/officers/${users.OFFICER.id}`, {
      method: 'DELETE',
      token: officerToken
    });
    record('Officer blocked from delete officer', officerDeleteAttempt.status === 403, `${officerDeleteAttempt.status}`);
    const officerAdminAttempt = await jsonRequest(baseUrl, '/admin/officers', { token: officerToken });
    record('Officer blocked from user management', officerAdminAttempt.status === 403, `${officerAdminAttempt.status}`);

    const officerDashboardAttempt = await jsonRequest(baseUrl, '/reports/dashboard', { token: officerToken });
    record('Officer blocked from admin dashboard', officerDashboardAttempt.status === 403, `${officerDashboardAttempt.status}`);

    const inactiveReportsAttempt = await jsonRequest(baseUrl, '/reports/summary', { token: manualInactiveToken });
    record('Inactive officer token blocked from reports summary', inactiveReportsAttempt.status === 403, `${inactiveReportsAttempt.status}`);

  } catch (err) {
    console.error('Test run failed with exception:', err);
    process.exitCode = 1;
  } finally {
    for (const id of created.visits) {
      await db.query('DELETE FROM visits WHERE id = ?', [id]).catch(() => null);
    }
    for (const id of created.visitors) {
      await db.query('DELETE FROM visitors WHERE id = ?', [id]).catch(() => null);
    }
    for (const user of created.users) {
      await db.query('DELETE FROM users WHERE id = ?', [user.id]).catch(() => null);
    }

    if (server) {
      server.closeAllConnections?.();
      server.closeIdleConnections?.();
      server.close();
    }

    await db.pool.end();

    console.log('\nAuthorization regression test results');
    let passed = 0;
    for (const test of results) {
      const status = test.ok ? 'PASS' : 'FAIL';
      console.log(`${status}: ${test.name}${test.details ? ` (${test.details})` : ''}`);
      if (test.ok) passed += 1;
    }
    console.log(`\n${passed}/${results.length} tests passed`);

    if (results.some((test) => !test.ok)) {
      process.exitCode = 1;
    }
  }
}

await run();
