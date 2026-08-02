import { db } from '../src/config/db.js';
import { createVisitor } from '../src/services/visitorService.js';
import { createVisitAtomic } from '../src/services/visitService.js';

async function runTaskA2BulkCheckinTest() {
  console.log('--- Starting Task A2 Test: Bulk Check-In Partial Batch Processing ---');

  try {
    // Authenticate Admin
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aliyakubuabdulrahman@gmail.com', password: '@SmartStrongSystem2026' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;

    // Cleanup test visitors/visits
    const phones = ['+2348666661111', '+2348666662222', '+2348666663333'];
    await db.query(`DELETE FROM visits WHERE visitor_id IN (SELECT id FROM visitors WHERE phone_number IN (?,?,?))`, phones);
    await db.query(`DELETE FROM visitors WHERE phone_number IN (?,?,?)`, phones);

    // Setup Visitor 1 (Active visit) and Visitor 3 (Existing visitor, no active visit)
    const v1Id = await createVisitor({ fullName: 'Bulk V1 Active', phoneNumber: phones[0], visitorType: 'BD', code: 'BLK-001' });
    const v3Id = await createVisitor({ fullName: 'Bulk V3 Inactive', phoneNumber: phones[2], visitorType: 'BD', code: 'BLK-003' });

    // Create ACTIVE visit for V1
    await createVisitAtomic({ visitorId: v1Id, officerId: 1, purpose: 'Pre-existing active visit', personToSee: 'Manager' });

    // Bulk Check-in Payload (3 visitors: V1 conflict, V2 new, V3 existing no active visit)
    const bulkPayload = {
      purpose: 'Bulk Check-In Batch Test',
      person_to_see: 'Director',
      visitors: [
        { full_name: 'Bulk V1 Active', phone_number: phones[0], visitor_type: 'BD', code: 'BLK-001' },
        { full_name: 'Bulk V2 New', phone_number: phones[1], visitor_type: 'BD', code: 'BLK-002' },
        { full_name: 'Bulk V3 Inactive', phone_number: phones[2], visitor_type: 'BD', code: 'BLK-003' }
      ]
    };

    const bulkRes = await fetch('http://localhost:4000/api/visits/bulk-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(bulkPayload)
    });
    const bulkData = await bulkRes.json();
    console.log('Bulk Checkin Response Status:', bulkRes.status, bulkData);

    if (bulkRes.status !== 200 || !bulkData.success) {
      throw new Error(`Bulk Checkin Failed! Status: ${bulkRes.status}, Response: ${JSON.stringify(bulkData)}`);
    }

    if (bulkData.created !== 1 || bulkData.reused !== 1 || bulkData.failed !== 1) {
      throw new Error(`Unexpected batch counts! Expected {created: 1, reused: 1, failed: 1}, got: ${JSON.stringify(bulkData)}`);
    }

    console.log('✅ TASK A2 PASSED: Bulk checkin processed partial batch cleanly (1 created, 1 reused, 1 failed/conflict)!');
    process.exit(0);
  } catch (err) {
    console.error('❌ TASK A2 TEST FAILED:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

runTaskA2BulkCheckinTest();
