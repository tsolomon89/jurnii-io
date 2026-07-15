const https = require('https');
const querystring = require('querystring');

// Simple file-based or memory-based token caching for local dev
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const params = querystring.stringify({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });

  const options = {
    hostname: 'accounts.zoho.eu',
    path: '/oauth/v2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(params)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.access_token) {
            cachedToken = data.access_token;
            tokenExpiresAt = Date.now() + (data.expires_in * 1000);
            resolve(cachedToken);
          } else {
            reject(new Error(`Failed to refresh Zoho token: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(params);
    req.end();
  });
}

async function requestZoho(method, path, body = null) {
  const token = await getAccessToken();
  const domain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.eu';
  const url = `${domain}${path}`;

  const parsedUrl = new URL(url);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          if (!resBody) {
            resolve({});
            return;
          }
          const parsed = JSON.parse(resBody);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Zoho response: ${resBody}`));
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Searches for a Contact by email address.
 */
async function searchContactByEmail(email) {
  const path = `/crm/v6/Contacts/search?email=${encodeURIComponent(email)}`;
  const res = await requestZoho('GET', path);
  if (res.data && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

/**
 * Searches for a Lead by email address.
 */
async function searchLeadByEmail(email) {
  const path = `/crm/v6/Leads/search?email=${encodeURIComponent(email)}`;
  const res = await requestZoho('GET', path);
  if (res.data && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

/**
 * Creates a minimal Lead.
 */
async function createLead(leadData) {
  const path = '/crm/v6/Leads';
  const payload = {
    data: [leadData]
  };
  const res = await requestZoho('POST', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to create Lead in Zoho: ${JSON.stringify(res)}`);
}

/**
 * Updates a Lead.
 */
async function updateLead(leadId, leadData) {
  const path = `/crm/v6/Leads/${leadId}`;
  const payload = {
    data: [leadData]
  };
  const res = await requestZoho('PUT', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to update Lead in Zoho: ${JSON.stringify(res)}`);
}

/**
 * Updates a Contact.
 */
async function updateContact(contactId, contactData) {
  const path = `/crm/v6/Contacts/${contactId}`;
  const payload = {
    data: [contactData]
  };
  const res = await requestZoho('PUT', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to update Contact in Zoho: ${JSON.stringify(res)}`);
}

/**
 * Creates a Website Submission record.
 */
async function createSubmissionRecord(submissionData) {
  const moduleName = process.env.ZOHO_SUBMISSION_MODULE || 'Website_Submissions';
  const path = `/crm/v6/${moduleName}`;
  const payload = {
    data: [submissionData]
  };
  const res = await requestZoho('POST', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  // Fallback to logs if module doesn't exist yet
  console.warn(`Submission module ${moduleName} failed or does not exist: ${JSON.stringify(res)}`);
  return 'MOCK_SUBMISSION_ID';
}

/**
 * Updates a Website Submission record.
 */
async function updateSubmissionRecord(recordId, submissionData) {
  if (recordId === 'MOCK_SUBMISSION_ID') return recordId;
  const moduleName = process.env.ZOHO_SUBMISSION_MODULE || 'Website_Submissions';
  const path = `/crm/v6/${moduleName}/${recordId}`;
  const payload = {
    data: [submissionData]
  };
  const res = await requestZoho('PUT', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to update submission record ${recordId}: ${JSON.stringify(res)}`);
}

/**
 * Creates a meeting Event in Zoho CRM.
 */
async function createZohoEvent(eventData) {
  const path = '/crm/v6/Events';
  const payload = {
    data: [eventData]
  };
  const res = await requestZoho('POST', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to create Event in Zoho: ${JSON.stringify(res)}`);
}

/**
 * Searches for a Zoho Event by external calendar booking ID.
 */
async function searchEventByExternalId(externalId) {
  const path = `/crm/v6/Events/search?criteria=(Ext_Calendar_Booking_ID:equals:${externalId})`;
  const res = await requestZoho('GET', path);
  if (res.data && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

/**
 * Updates a meeting Event in Zoho CRM.
 */
async function updateZohoEvent(eventId, eventData) {
  const path = `/crm/v6/Events/${eventId}`;
  const payload = {
    data: [eventData]
  };
  const res = await requestZoho('PUT', path, payload);
  if (res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new Error(`Failed to update Event in Zoho: ${JSON.stringify(res)}`);
}

module.exports = {
  requestZoho,
  searchContactByEmail,
  searchLeadByEmail,
  createLead,
  updateLead,
  updateContact,
  createSubmissionRecord,
  updateSubmissionRecord,
  createZohoEvent,
  searchEventByExternalId,
  updateZohoEvent
};
