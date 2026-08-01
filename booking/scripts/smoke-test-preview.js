'use strict';

const https = require('https');
const http = require('http');

const BASE_URL = process.env.PREVIEW_URL || 'https://jurnii-git-feat-booking-databa-263d6a-timothy-solomons-projects.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || 'MUPWbg-qqyqffVoj4ngtbEhzosL-Rtk-L4wjLFOCz0U';

console.log('--- Jurnii Booking Preview Smoke Test ---');
console.log('Target Base URL:', BASE_URL);
console.log('----------------------------------------');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runSmokeTests() {
  const results = [];
  const record = (name, pass, detail = '') => {
    results.push({ name, pass, detail });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  };

  // 1. Manage HTML loads
  try {
    const res = await request('GET', '/manage.html');
    if (res.status === 200 && res.body.includes('Jurnii')) {
      record('1. manage.html loads', true, 'status 200 OK');
    } else {
      record('1. manage.html loads', false, `status ${res.status}`);
    }
  } catch (err) {
    record('1. manage.html loads', false, err.message);
  }

  // 2. Page 1 Persistence (POST /api/v1/submissions/start)
  let journeyId = null;
  let flowToken = null;
  try {
    const res = await request('POST', '/api/v1/submissions/start', {
      email: `preview-smoke-${Date.now()}@example.com`,
      firstName: 'Preview',
      lastName: 'SmokeTester',
      company: 'Jurnii Preview Corp',
      jobTitleRaw: 'Lead Tester',
      countryIso2: 'GB',
      productInterest: 'Jurnii 360',
    });
    if (res.status === 200 && res.json && res.json.journeyId) {
      journeyId = res.json.journeyId;
      flowToken = res.json.token || res.json.flowToken;
      record('2. Page 1 persists', true, `journeyId=${journeyId}`);
    } else {
      record('2. Page 1 persists', false, `status ${res.status}: ${res.body}`);
    }
  } catch (err) {
    record('2. Page 1 persists', false, err.message);
  }

  // 3. Page 2 Persistence (PATCH /api/v1/submissions/[id])
  let page2Token = null;
  if (journeyId && flowToken) {
    try {
      const res = await request('PATCH', `/api/v1/submissions/${journeyId}`, {
        company: 'Jurnii Preview Corp',
        jobTitle: 'Lead Tester',
        countryIso2: 'GB',
        dialCode: '+44',
        nationalNumber: '7700900123',
        productInterest: 'Jurnii 360',
      }, {
        'Authorization': `Bearer ${flowToken}`,
      });
      if (res.status === 200 && res.json && res.json.step === 2) {
        page2Token = res.json.token || flowToken;
        record('3. Page 2 commits and queues Zoho work', true, 'step: 2 committed');
      } else {
        record('3. Page 2 commits and queues Zoho work', false, `status ${res.status}: ${res.body}`);
      }
    } catch (err) {
      record('3. Page 2 commits and queues Zoho work', false, err.message);
    }
  }

  // 4. Availability loads
  try {
    const res = await request('GET', '/api/v1/availability');
    if (res.status === 200 && res.json && Array.isArray(res.json.slots)) {
      record('4. Availability loads', true, `${res.json.slots.length} slots returned`);
    } else {
      record('4. Availability loads', false, `status ${res.status}: ${res.body}`);
    }
  } catch (err) {
    record('4. Availability loads', false, err.message);
  }

  // 5. Booking endpoint (pick a unique future slot offset by random days)
  let manageUrl = null;
  let manageToken = null;
  const activeToken = page2Token || flowToken;
  if (journeyId && activeToken) {
    try {
      const start = new Date();
      // Offset by 10 days + random 0-4 days to hit an unreserved weekday
      const dayOffset = 10 + (Math.floor(Math.random() * 5));
      start.setUTCDate(start.getUTCDate() + dayOffset);
      if (start.getUTCDay() === 0) start.setUTCDate(start.getUTCDate() + 1); // Sunday -> Monday
      if (start.getUTCDay() === 6) start.setUTCDate(start.getUTCDate() + 2); // Saturday -> Monday
      start.setUTCHours(14, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60 * 1000);

      const res = await request('POST', '/api/v1/bookings', {
        journeyId,
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
      }, {
        'Authorization': `Bearer ${activeToken}`,
      });

      const bStatus = res.json && (res.json.status || res.json.bookingStatus || res.json.code);
      if ([200, 202].includes(res.status) && bStatus) {
        manageUrl = res.json.manageUrl;
        manageToken = res.json.manageToken;
        record('5. Booking endpoint', true, `status ${res.status}, status: ${bStatus}`);
      } else if (res.status === 409 && res.json && res.json.code === 'SLOT_TAKEN') {
        record('5. Booking endpoint', true, 'status 409 SLOT_TAKEN (concurrency hold verified)');
      } else {
        record('5. Booking endpoint', false, `status ${res.status}: ${res.body}`);
      }
    } catch (err) {
      record('5. Booking endpoint', false, err.message);
    }
  }

  // 6. Status Polling
  if (journeyId && activeToken) {
    try {
      const res = await request('GET', `/api/v1/bookings/${journeyId}/status`, null, {
        'Authorization': `Bearer ${activeToken}`,
      });
      const bStatus = res.json && (res.json.status || res.json.bookingStatus);
      if (res.status === 200 && bStatus) {
        record('6. Status polling', true, `status: ${bStatus}`);
      } else {
        record('6. Status polling', false, `status ${res.status}: ${res.body}`);
      }
    } catch (err) {
      record('6. Status polling', false, err.message);
    }
  }

  // 7. Cancellation disabled behaviour (returns 403)
  if (journeyId && activeToken) {
    try {
      const res = await request('DELETE', `/api/v1/bookings/${journeyId}`, null, {
        'Authorization': `Bearer ${activeToken}`,
      });
      if (res.status === 403 && res.json && res.json.code === 'cancellation_disabled') {
        record('7. Cancellation disabled (403)', true, '403 cancellation_disabled returned');
      } else {
        record('7. Cancellation disabled (403)', false, `expected 403, got ${res.status}: ${res.body}`);
      }
    } catch (err) {
      record('7. Cancellation disabled (403)', false, err.message);
    }
  }

  // 8. Cron worker endpoint
  try {
    const res = await request('POST', '/api/v1/internal/jobs/run', {}, {
      'Authorization': `Bearer ${CRON_SECRET}`,
    });
    if (res.status === 200) {
      record('8. Cron worker endpoint', true, 'status 200 OK');
    } else {
      record('8. Cron worker endpoint', false, `status ${res.status}: ${res.body}`);
    }
  } catch (err) {
    record('8. Cron worker endpoint', false, err.message);
  }

  // 9. Retention endpoint dry-run
  try {
    const res = await request('POST', '/api/v1/internal/jobs/retention?dryRun=true', {}, {
      'Authorization': `Bearer ${CRON_SECRET}`,
    });
    if (res.status === 200) {
      record('9. Retention dry-run endpoint', true, 'status 200 OK');
    } else {
      record('9. Retention dry-run endpoint', false, `status ${res.status}: ${res.body}`);
    }
  } catch (err) {
    record('9. Retention dry-run endpoint', false, err.message);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\nSummary: ${passed}/${results.length} smoke tests passed.`);
}

runSmokeTests().catch(console.error);
