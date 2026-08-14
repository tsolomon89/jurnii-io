/**
 * The only file in the project that knows Google Tag Manager exists.
 *
 * The booking widget is designed to be copy-pasted into another project (see
 * booking/README.md), so it must not carry a dependency on any particular analytics
 * vendor. It dispatches plain `jurnii:booking` / `jurnii:cta` CustomEvents on window and
 * stops there. This adapter is what turns those into dataLayer pushes.
 *
 * Swapping vendors, or running two at once, means editing this file and nothing else.
 *
 * Loaded as a classic script from all three served pages, so it must not assume a
 * bundler, `let`/`const`, or arrow functions.
 */
/*
 * UMD-ish, for the same reason booking/assets/booking-form.js is: the tests install it
 * against a jsdom window rather than a real one. In a browser `globalThis` has a
 * `document`, so the factory runs immediately and installs itself — a plain classic
 * script. Under CommonJS it is exported un-invoked and nothing global is touched.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  if (root && root.document) factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (win) {
  'use strict';
  if (!win || !win.addEventListener) return;

  // Both the bundled copy on the SPA and the unhashed copy on the plain pages can be
  // present. Listening twice would double every booking event.
  if (win.__jurniiAnalyticsBridge) return;
  win.__jurniiAnalyticsBridge = true;

  win.dataLayer = win.dataLayer || [];

  /**
   * Field names that must never reach the tag layer, whatever an emitter passes.
   *
   * The widget already restricts what it emits, but this is a second, independent gate:
   * the cost of a mistake here is personal data sent to a third party, and one careless
   * `Object.assign` upstream should not be enough to cause it. `journeyId` / `bookingId`
   * are on the list because they are the same UUID — the subject of the signed manage
   * link and the visitor's own booking reference, so an identifier rather than a
   * transaction id.
   */
  var FORBIDDEN = [
    'firstName', 'first_name',
    'lastName', 'last_name',
    'email', 'emailAddress', 'email_address',
    'phone', 'nationalNumber', 'national_number', 'phone_e164',
    'company', 'companyName', 'company_name',
    'jobTitleOther', 'job_title_other_text',
    'journeyId', 'journey_id',
    'bookingId', 'booking_id',
    'token', 'manageUrl', 'manage_url'
  ];

  function scrub(detail) {
    var out = {};
    for (var key in detail) {
      if (!Object.prototype.hasOwnProperty.call(detail, key)) continue;
      if (FORBIDDEN.indexOf(key) !== -1) continue;
      var value = detail[key];
      // Objects and arrays are refused rather than flattened: GA4 cannot report them,
      // and a nested blob is exactly where PII hides from a name-based check.
      if (value !== null && typeof value === 'object') continue;
      out[key] = value;
    }
    return out;
  }

  function forward(ev) {
    var detail = (ev && ev.detail) || null;
    if (!detail || !detail.event) return;
    win.dataLayer.push(scrub(detail));
  }

  win.addEventListener('jurnii:booking', forward);
  win.addEventListener('jurnii:cta', forward);
});
