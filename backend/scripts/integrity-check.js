import http from 'http';
import { createApp } from '../src/app.js';
import { db } from '../src/config/db.js';

const results = {
  startedAt: new Date().toISOString(),
  db: { ok: false, error: null },
  api: { ok: false, status: null, error: null }
};

async function checkDb() {
  try {
    await db.query('SELECT 1');
    results.db.ok = true;
  } catch (err) {
    const details = [];
    if (err?.code) details.push(`code=${err.code}`);
    if (err?.errno) details.push(`errno=${err.errno}`);
    if (err?.sqlMessage) details.push(`sqlMessage=${err.sqlMessage}`);
    const suffix = details.length ? ` (${details.join(', ')})` : '';
    results.db.error = `${err?.message || String(err)}${suffix}`;
  }
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        if (data) {
          try {
            json = JSON.parse(data);
          } catch (err) {
            json = null;
          }
        }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });
    req.on('error', reject);
  });
}

async function checkApi() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });

  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/health`;

  try {
    const response = await httpGetJson(url);
    results.api.status = response.status;
    results.api.ok = response.status === 200 && response.body && response.body.status === 'ok';
    if (!results.api.ok) {
      results.api.error = `Unexpected response status ${response.status}`;
    }
  } catch (err) {
    results.api.error = err?.message || String(err);
  } finally {
    server.close();
  }
}

await checkDb();
await checkApi();

console.log('Integrity check results');
console.log(`DB: ${results.db.ok ? 'OK' : 'FAILED'}`);
if (!results.db.ok) {
  console.log(`DB error: ${results.db.error || 'Unknown error'}`);
}
console.log(`API /api/health: ${results.api.ok ? 'OK' : 'FAILED'}`);
if (results.api.status !== null) {
  console.log(`API status: ${results.api.status}`);
}
if (results.api.error) {
  console.log(`API error: ${results.api.error}`);
}

if (!results.db.ok || !results.api.ok) {
  process.exitCode = 1;
}
