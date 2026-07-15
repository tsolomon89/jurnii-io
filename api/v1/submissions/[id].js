const jwt = require('jsonwebtoken');
const {
  requestZoho,
  updateLead,
  updateContact,
  updateSubmissionRecord
} = require('../../_utils/zoho');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query; // This is the submission record ID in Zoho
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token', message: err.message });
  }

  // Ensure submissionId in path matches token to prevent tampering
  if (decoded.submissionId !== id) {
    return res.status(400).json({ error: 'Token mismatch with submission ID' });
  }

  const { company, jobTitle, phone, country, productInterest } = req.body;

  try {
    let leadId = decoded.leadId;
    let contactId = decoded.contactId;
    let dealId = null;

    // 1. Update the related Lead or Contact in Zoho CRM
    if (contactId) {
      await updateContact(contactId, {
        Company_Name__s: company, // Standard API name for Contact's company in some versions
        Title: jobTitle,
        Phone: phone,
        Mailing_Country: country,
        Product_Interest: productInterest ? [productInterest] : []
      });
    } else if (leadId) {
      await updateLead(leadId, {
        Company: company,
        Title: jobTitle,
        Phone: phone,
        Country: country,
        Product_Interest: productInterest ? [productInterest] : []
      });

      // 2. Poll Lead record to check if Zoho Workflow automatically converted it
      // Bounded polling: 5 attempts with 1-second delay
      let isConverted = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const leadRes = await requestZoho('GET', `/crm/v6/Leads/${leadId}`);
        if (leadRes.data && leadRes.data.length > 0) {
          const lead = leadRes.data[0];
          if (lead.Is_Converted || lead.$converted) {
            contactId = lead.Converted_Contact ? lead.Converted_Contact.id : null;
            dealId = lead.Converted_Deal ? lead.Converted_Deal.id : null;
            isConverted = true;
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Lead conversion status for ${leadId}: converted=${isConverted}, contact=${contactId}, deal=${dealId}`);
    }

    // 3. Update the progressive state in the Website Submission record
    const updateData = {
      Submission_Step: 'Step 2',
      Company: company,
      Job_Title: jobTitle,
      Phone: phone,
      Country: country,
      Product_Interest: productInterest
    };
    if (contactId) updateData.Contact_Lookup = contactId;
    if (dealId) updateData.Deal_Lookup = dealId;

    await updateSubmissionRecord(id, updateData);

    // 4. Generate new signed JWT token for Step 3
    const nextToken = jwt.sign(
      {
        submissionId: id,
        email: decoded.email,
        leadId,
        contactId,
        dealId,
        step: 2
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      token: nextToken,
      contactId,
      dealId
    });
  } catch (error) {
    console.error('Submissions Update Error:', error);
    return res.status(500).json({ error: 'Failed to update submission', message: error.message });
  }
};
