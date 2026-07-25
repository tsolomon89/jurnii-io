const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  searchContactsByEmail,
  searchLeadsByEmail,
  createLead,
  createSubmissionRecord
} = require('../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

/**
 * Attribution is written to the Lead ONLY when the destination field API names
 * are configured via env (they must be created + approved in Zoho first — no
 * UTM field exists by default). Otherwise attribution is logged and carried in
 * the flow, never written to an unverified field (which would break the create).
 */
function attributionFields(a) {
  const out = {};
  const map = [
    [process.env.ZOHO_LEAD_FIELD_SOURCE_PAGE, a.sourcePage],
    [process.env.ZOHO_LEAD_FIELD_UTM_SOURCE, a.utmSource],
    [process.env.ZOHO_LEAD_FIELD_UTM_MEDIUM, a.utmMedium],
    [process.env.ZOHO_LEAD_FIELD_UTM_CAMPAIGN, a.utmCampaign]
  ];
  for (const [field, val] of map) if (field && val) out[field] = val;
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  const {
    firstName, lastName, email, consent,
    sourcePage, utmSource, utmMedium, utmCampaign
  } = req.body || {};

  if (!firstName || !lastName || !email) {
    return fail(res, 400, 'validation', 'Missing required fields: firstName, lastName, email');
  }
  if (!EMAIL_RE.test(String(email).trim())) {
    return fail(res, 400, 'validation', 'Invalid email address');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const attribution = { sourcePage, utmSource, utmMedium, utmCampaign };
  // No PII in logs: log a non-reversible email fingerprint and which attribution
  // keys are present (not their values).
  const emailFp = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12);
  const attributionKeys = Object.keys(attribution).filter(k => attribution[k]).join(',') || 'none';
  console.log(`[start] intake email_fp=${emailFp} attribution_keys=${attributionKeys}`);

  try {
    // Resolve the intake target. An existing Contact is a MERGE TARGET for
    // processLead, not a reason to skip Lead creation. Only an existing single
    // unconverted Lead is reused. Ambiguity stops progression (Manual Review).
    const [contacts, leads] = await Promise.all([
      searchContactsByEmail(normalizedEmail),
      searchLeadsByEmail(normalizedEmail)
    ]);

    if (contacts.length > 1 || leads.length > 1) {
      // Record the ambiguity for ops (best-effort) and stop.
      try {
        await createSubmissionRecord({
          Name: `SUB-${Date.now()}`,
          First_Name: firstName,
          Last_Name: lastName,
          Email: normalizedEmail,
          Submission_Step: 'Step 1',
          Integration_Status: 'Pending',
          Error_Message: `MANUAL_REVIEW: ambiguous_identity contacts=${contacts.length} leads=${leads.length}`
        });
      } catch (e) {
        console.warn(`[start] could not record manual-review submission (${e.code || e.message})`);
      }
      return fail(res, 409, 'MANUAL_REVIEW', 'We found multiple records for this email; our team will follow up.', { reason: 'ambiguous_identity' });
    }

    let leadId;
    if (leads.length === 1) {
      leadId = leads[0].id;
      console.log(`[start] reusing existing unconverted Lead ${leadId}`);
    } else {
      // Create the submission-specific transient Lead with workflow triggers
      // SUPPRESSED so the conversion automation does NOT fire on Page 1.
      const leadData = Object.assign(
        {
          First_Name: firstName,
          Last_Name: lastName,
          Email: normalizedEmail,
          Lead_Source: 'Website Booking Form'
        },
        consent === true ? { Contact_Marketing_Consent: true } : {},
        attributionFields(attribution)
      );
      leadId = await createLead(leadData, { trigger: [] });
      console.log(`[start] created transient Lead ${leadId} (workflow suppressed)`);
    }

    // Persist progressive state. Only known-safe fields are written.
    const submissionRecordId = await createSubmissionRecord({
      Name: `SUB-${Date.now()}`,
      First_Name: firstName,
      Last_Name: lastName,
      Email: normalizedEmail,
      Submission_Step: 'Step 1',
      Integration_Status: 'Pending',
      Lead_Lookup: leadId
    });

    const token = jwt.sign(
      {
        submissionId: submissionRecordId,
        email: normalizedEmail,
        leadId,
        contactId: null,
        step: 1
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({ token, submissionId: submissionRecordId, step: 1 });
  } catch (error) {
    console.error('[start] error:', error.code || error.message);
    return fail(res, 502, error.code || 'submission_start_failed', 'Could not start your registration. Please try again.');
  }
};
