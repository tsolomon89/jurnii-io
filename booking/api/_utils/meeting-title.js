// The ONE meeting-title builder. Its output is the Google Calendar `summary`, the Zoho
// `Event_Title` and the persisted `booking_journeys.meeting_title` — one string, built
// once, never rebuilt differently by a second caller.
//
// The title is a PRESENTATION surface, not an integration protocol. Nothing parses
// business data back out of it: the Deluge automation reads `Who_Id`, `What_Id`,
// `$se_module`, `Meeting_Task_Stage/State/Status`, `Meeting_Task_Contract_Products` and
// `Ext_Calendar_Booking_ID`, and must continue to.
//
// Kept dependency-free bar the product helpers, so it is trivially unit-testable
// offline and safe to require from the db layer (`db/queries/journeys.js` already
// requires `api/_utils/email` for the same reason).

const { orderedProducts } = require('./products');

/**
 * Live `Events.Event_Title` length, from Zoho metadata (pinned in
 * `tests/fixtures/zoho-fields.json` under `lengths`). The Google summary has no
 * comparable hard limit, so the tighter of the two governs both — one string means one
 * budget.
 */
const EVENT_TITLE_MAX = 255;

/**
 * A first name longer than this is a paste accident, not a name. Capping it here keeps
 * the company budget below predictable rather than letting one field eat the other.
 * `V.LIMITS.first_name` is 80, so this only ever bites on the unreasonable tail.
 */
const FIRST_NAME_MAX = 40;

/** What a booking with no selected product is called. Never `Not sure yet`. */
const NO_PRODUCT_LABEL = 'Product Discovery';

const BRAND = 'Jurnii';
const SEP = ' | ';
const WHO_SEP = ' - ';
const PRODUCT_JOIN = ' + ';

/**
 * C0 and C1 control characters -> a space.
 *
 * Written as a code-point scan rather than a regex character class on purpose: the
 * class spans the C0 range and the C1 range, and an escape sequence inside a literal is
 * exactly the kind of thing an editor or a copy-paste silently mangles into the raw
 * bytes it denotes. This form cannot be mis-encoded, and it says what it means.
 *
 * Replacing with a SPACE (not the empty string) matters: the collapse below then turns
 * "Bet\n\nCo" into "Bet Co" rather than "BetCo".
 */
function stripControlChars(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    out += (c < 0x20 || (c >= 0x7f && c <= 0x9f)) ? ' ' : ch;
  }
  return out;
}

/**
 * A single title segment, made safe for a one-line subject.
 *
 * A literal `|` in a value becomes `/` so the separator shape stays unambiguous to a
 * human reader. That is cosmetic — nothing reads the title back.
 */
function sanitizeTitlePart(v) {
  return stripControlChars(String(v == null ? '' : v))
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')   // also absorbs NBSP and the other unicode spaces
    .trim();
}

/**
 * The products of a journey as one display string, or `Product Discovery`.
 *
 * Shared by the title and by both event descriptions, so the two can never disagree
 * about what was selected.
 */
function productsLabel(journey) {
  const products = orderedProducts(journey);
  return products.length ? products.join(PRODUCT_JOIN) : NO_PRODUCT_LABEL;
}

/**
 * `Jurnii | {Company} - {First} | {Products}`
 *
 * Takes primitives, not a row, so the truncation and degradation rules are testable
 * without a journey. `meetingTitleFor` is the row-shaped entry point.
 *
 * Degradation, in the order the requirement gives: a long COMPANY is truncated before
 * the contact or the product context is touched. If the company budget collapses below
 * a legible minimum the company segment is dropped whole rather than reduced to a stub
 * — unreachable with today's four products, and the guard for a fifth.
 *
 *   BetCo + Sarah  ->  Jurnii | BetCo - Sarah | Jurnii UX
 *   BetCo          ->  Jurnii | BetCo | Jurnii UX
 *   Sarah          ->  Jurnii | Sarah | Jurnii UX
 *   neither        ->  Jurnii | Jurnii UX
 *
 * INVARIANT: never returns an empty string, for any input. That is what lets
 * `buildMeetingPayload` pass the result straight to `Event_Title` without an
 * `|| 'Jurnii Product Demo Meeting'` fallback quietly reintroducing the old constant in
 * a second place.
 */
function buildMeetingTitle({ company, firstName, products } = {}) {
  const productsPart = sanitizeTitlePart(products) || NO_PRODUCT_LABEL;
  const first = sanitizeTitlePart(firstName).slice(0, FIRST_NAME_MAX).trim();

  // Everything the company does NOT get: the brand, both separators, the products, and
  // the contact segment when there is one.
  const fixed = BRAND.length + SEP.length + SEP.length + productsPart.length
    + (first ? WHO_SEP.length + first.length : 0);
  const companyBudget = EVENT_TITLE_MAX - fixed;

  let co = sanitizeTitlePart(company);
  if (companyBudget < 8) co = '';
  else if (co.length > companyBudget) co = co.slice(0, companyBudget).replace(/[\s\-,.:;/]+$/, '');

  const who = (co && first) ? `${co}${WHO_SEP}${first}` : (co || first);

  const title = who
    ? `${BRAND}${SEP}${who}${SEP}${productsPart}`
    : `${BRAND}${SEP}${productsPart}`;

  // Backstop, not a strategy — the budget above already guarantees the cap. It exists so
  // a later edit to the format cannot silently start sending Zoho an over-long title.
  return title.slice(0, EVENT_TITLE_MAX).trim();
}

/**
 * The title of a journey: the persisted value when there is one, otherwise built from
 * the row.
 *
 * The fallback covers rows that committed page 2 before migration 0005 and any path
 * that never ran R1. It is deliberately NOT written back — `meeting_title` is absent
 * from `GOOGLE_COLUMNS` and `ZOHO_COLUMNS`, so no booking, reschedule, cancel, recovery
 * or Zoho step can rewrite it. For those rows the two read sites agree because the
 * inputs are frozen: from G1 onward `booking_status = 'confirmed'`, which
 * `R1_page2Commit`'s WHERE clause excludes.
 */
function meetingTitleFor(journey) {
  const j = journey || {};
  if (j.meeting_title) return j.meeting_title;
  return buildMeetingTitle({
    company: j.company,
    firstName: j.first_name,
    products: productsLabel(j),
  });
}

/** The contact's display name for an attendee-facing description line. */
function contactFullName(journey) {
  const j = journey || {};
  return sanitizeTitlePart(`${j.first_name || ''} ${j.last_name || ''}`);
}

module.exports = {
  sanitizeTitlePart,
  productsLabel,
  buildMeetingTitle,
  meetingTitleFor,
  contactFullName,
  EVENT_TITLE_MAX,
  FIRST_NAME_MAX,
  NO_PRODUCT_LABEL,
};
