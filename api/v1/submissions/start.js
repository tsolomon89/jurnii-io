const jwt = require('jsonwebtoken');
const {
  searchContactByEmail,
  searchLeadByEmail,
  createLead,
  createSubmissionRecord
} = require('../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email, consent } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email' });
  }

  // Normalize email to prevent duplicates (lowercase, trim)
  const normalizedEmail = email.trim().toLowerCase();

  try {
    let contactId = null;
    let leadId = null;

    // 1. Search Contacts first
    const contact = await searchContactByEmail(normalizedEmail);
    if (contact) {
      contactId = contact.id;
    } else {
      // 2. Search unconverted Leads
      const lead = await searchLeadByEmail(normalizedEmail);
      if (lead) {
        leadId = lead.id;
      } else {
        // 3. Create a minimal Lead if neither exists
        leadId = await createLead({
          First_Name: firstName,
          Last_Name: lastName,
          Email: normalizedEmail,
          Lead_Source: 'Website Booking Form',
          Consent_Given: consent || false
        });
      }
    }

    // 4. Create Website Submission record in Zoho to hold progressive state
    const submissionRecordId = await createSubmissionRecord({
      Name: `SUB-${Date.now()}`,
      First_Name: firstName,
      Last_Name: lastName,
      Email: normalizedEmail,
      Submission_Step: 'Step 1',
      Integration_Status: 'Pending',
      Lead_Lookup: leadId,
      Contact_Lookup: contactId
    });

    // 5. Generate signed JWT continuation token
    const token = jwt.sign(
      {
        submissionId: submissionRecordId,
        email: normalizedEmail,
        leadId,
        contactId,
        step: 1
      },
      JWT_SECRET,
      { expiresIn: '2h' } // 2 hours expiration
    );

    return res.status(200).json({
      token,
      submissionId: submissionRecordId
    });
  } catch (error) {
    console.error('Submissions Start Error:', error);
    return res.status(500).json({ error: 'Failed to initialize submission', message: error.message });
  }
};
