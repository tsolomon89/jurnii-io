const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  searchContactsByEmail,
  searchLeadsByEmail,
  createLead,
  updateLead,
  updateContact
} = require('../../_utils/zoho');
const { isBusinessEmail, normalizeEmail } = require('../../_utils/email');

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Lead_Source must be a valid Leads picklist option ('Website' exists live;
// 'Website Booking Form' does NOT). Overridable if a dedicated value is added.
const LEAD_SOURCE = process.env.ZOHO_LEAD_SOURCE || 'Website';

function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

/**
 * Attribution is written ONLY when the destination Lead field API names are
 * configured via env (no UTM field exists by default). These are Lead-scoped, so
 * they are applied on the Lead path only.
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
    firstName, lastName, email, consent, journeyId,
    sourcePage, utmSource, utmMedium, utmCampaign
  } = req.body || {};

  if (!firstName || !lastName || !email) {
    return fail(res, 400, 'validation', 'Missing required fields: firstName, lastName, email');
  }
  if (!EMAIL_RE.test(String(email).trim())) {
    return fail(res, 400, 'validation', 'Invalid email address');
  }
  // journeyId is client-generated (deterministic idempotency) — the server never
  // mints its own. Validate it is a well-formed UUID; it is only ever an opaque
  // correlation key, never a CRM id.
  if (!journeyId || !UUID_RE.test(String(journeyId))) {
    return fail(res, 400, 'validation', 'Missing or invalid journeyId');
  }

  const normalizedEmail = normalizeEmail(email);

  // Work-email-only intake: reject free/personal/disposable domains before any CRM call.
  if (!isBusinessEmail(normalizedEmail)) {
    return fail(res, 400, 'EMAIL_NOT_BUSINESS', 'Please use your work email address to book a demo.');
  }
  const attribution = { sourcePage, utmSource, utmMedium, utmCampaign };
  // No PII in logs: log a non-reversible email fingerprint + which attribution keys are present.
  const emailFp = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12);
  const attributionKeys = Object.keys(attribution).filter(k => attribution[k]).join(',') || 'none';
  console.log(`[start] intake email_fp=${emailFp} attribution_keys=${attributionKeys}`);

  try {
    // STRICTLY SEQUENTIAL identity resolution (Contact → unconverted Lead → create).
    // An exactly-matched Contact ends resolution entirely — Leads are NOT searched.
    const contacts = await searchContactsByEmail(normalizedEmail);
    if (contacts.length > 1) {
      console.warn(`[start] ambiguous identity for email_fp=${emailFp}: contacts=${contacts.length}`);
      return fail(res, 409, 'MANUAL_REVIEW', 'We found multiple records for this email; our team will follow up.', { reason: 'identity_ambiguous' });
    }

    let recordType, recordId, contactId = null;

    if (contacts.length === 1) {
      recordType = 'Contact';
      recordId = contacts[0].id;
      contactId = recordId;
      // Persist permitted Page-1 fields (consent) with workflows SUPPRESSED — do
      // NOT clobber the established name; attribution is Lead-scoped so skipped.
      const contactPage1 = Object.assign({}, consent === true ? { Contact_Marketing_Consent: true } : {});
      if (Object.keys(contactPage1).length > 0) {
        await updateContact(recordId, contactPage1, { trigger: [] });
      }
      console.log(`[start] reusing existing Contact ${recordId} (no Lead search)`);
    } else {
      // No Contact → search UNCONVERTED Leads only now.
      const leads = await searchLeadsByEmail(normalizedEmail);
      if (leads.length > 1) {
        console.warn(`[start] ambiguous identity for email_fp=${emailFp}: leads=${leads.length}`);
        return fail(res, 409, 'MANUAL_REVIEW', 'We found multiple records for this email; our team will follow up.', { reason: 'identity_ambiguous' });
      }

      recordType = 'Lead';
      const page1Lead = Object.assign(
        {
          First_Name: firstName,
          Last_Name: lastName,
          Email: normalizedEmail,
          Lead_Source: LEAD_SOURCE
        },
        consent === true ? { Contact_Marketing_Consent: true } : {},
        attributionFields(attribution)
      );

      if (leads.length === 1) {
        recordId = leads[0].id;
        // Reused unconverted Lead: persist all Page-1 fields, workflows SUPPRESSED.
        await updateLead(recordId, page1Lead, { trigger: [] });
        console.log(`[start] reusing existing unconverted Lead ${recordId}`);
      } else {
        // Create the transient Lead with workflow triggers SUPPRESSED so the
        // conversion automation (WF001a Process Lead) does NOT fire on Page 1.
        recordId = await createLead(page1Lead, { trigger: [] });
        console.log(`[start] created transient Lead ${recordId} (workflow suppressed)`);
      }
    }

    // The signed JWT is the journeyId → record binding (there is no store). The
    // client-supplied journeyId is bound in; CRM identity travels as recordType/recordId.
    const token = jwt.sign(
      {
        journeyId,
        recordType,
        recordId,
        email: normalizedEmail,
        contactId,
        step: 1,
        purpose: 'flow'
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({ token, journeyId, step: 1 });
  } catch (error) {
    console.error('[start] error:', error.code || error.message);
    return fail(res, 502, error.code || 'submission_start_failed', 'Could not start your registration. Please try again.');
  }
};
