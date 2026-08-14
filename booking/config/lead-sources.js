/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 *   source:    live Zoho field metadata (GET /crm/v6/settings/fields)
 *   generator: booking/scripts/zoho-field-snapshot.js
 *   verify:    node --env-file=.env.production.local \
 *                   booking/scripts/zoho-field-snapshot.js --check
 *
 * The ACTIVE Leads.Lead_Source options offered by the internal booking form.
 *
 * `label` is Zoho's display_value and `value` is its actual_value; five options differ
 * (Advertisement shows as "Import", Trade Show as "Trade Show / Event", Twitter as "X (Twitter)").
 * The form shows the label and submits the value — a label must never reach the CRM.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JurniiBookingLeadSources = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LEAD_SOURCES = [
    { value: "Advertisement", label: "Import" },
    { value: "Employee Referral", label: "Employee Referral" },
    { value: "External Referral", label: "External Referral" },
    { value: "Trade Show", label: "Trade Show / Event" },
    { value: "Facebook", label: "Facebook" },
    { value: "Twitter", label: "X (Twitter)" },
    { value: "Linkedin", label: "Linkedin" },
    { value: "Apollo", label: "Apollo" },
    { value: "Clay", label: "Clay" },
    { value: "Website", label: "Website" }
  ];

  return { LEAD_SOURCES: LEAD_SOURCES };
});
