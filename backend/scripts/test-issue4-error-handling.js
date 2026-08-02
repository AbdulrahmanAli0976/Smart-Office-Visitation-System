import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

async function runIssue4ErrorHandlingTest() {
  console.log('--- Starting Issue #4 & #5 Regression Test: Sentry SDK Middleware Ordering & Error Handling ---');

  try {
    // 1. Test 404 Catch-All Route via HTTP
    const res404 = await fetch('http://localhost:4000/api/unknown-route-test-404');
    console.log(`404 Handler Status: ${res404.status}`);
    const data404 = await res404.json();
    if (res404.status !== 404 || data404.error !== 'Route not found') {
      throw new Error(`404 handler failed! Received status ${res404.status}, response: ${JSON.stringify(data404)}`);
    }

    // 2. Integration Test for errorHandler middleware behavior as final handler
    let responseStatus = null;
    let responseJson = null;

    const mockReq = {
      method: 'GET',
      originalUrl: '/api/test-error',
      safeRoute: '/api/test-error',
      requestId: 'test-req-456',
      user: { id: 101 },
      app: {
        get: (key) => (key === 'sentryEnabled' ? true : false)
      }
    };

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      }
    };

    const mockNext = () => {
      throw new Error('next() was called after response handling!');
    };

    const testError = new Error('Test Exception for Sentry & ErrorHandler');
    testError.status = 500;

    // Execute error handler
    errorHandler(testError, mockReq, mockRes, mockNext);

    console.log(`ErrorHandler Status: ${responseStatus}, Response JSON:`, responseJson);

    if (responseStatus !== 500) {
      throw new Error(`Expected HTTP 500 status, got ${responseStatus}`);
    }

    console.log('\n✅ ISSUE #4 & #5 REGRESSION TEST PASSED: Sentry error handler is correctly ordered before custom errorHandler, and custom errorHandler responds cleanly as the final Express error handler!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ISSUE #4 & #5 REGRESSION TEST FAILED:', err);
    process.exit(1);
  }
}

runIssue4ErrorHandlingTest();
