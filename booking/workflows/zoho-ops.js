'use strict';

const db = require('../db');
const Z = require('../integrations/zoho');
const J = require('../db/queries/journeys');
const ZS = require('../db/queries/zoho-state');
const O = require('../db/queries/ops');
const RV = require('../db/queries/review');
const { zohoEventOwned } = require('../lib/ownership');
const {
  governedTitle, productList, primaryProduct, orderedProducts, mergeMultiSelect,
} = require('../api/_utils/products');
const { meetingTitleFor } = require('../api/_utils/meeting-title');
const { manageUrlFor } = require('../lib/auth');
const { activationStateForLink, retroLinkTriggersEnabled } = require('../lib/meeting-automation');
const { log } = require('../lib/http');

/**
 * Zoho worker steps.
 *
 * No step here writes booking truth: every write goes through `patchZoho`, whose
 * column allow-list cannot name `booking_status`, `google_event_id`, `slot_*`,
 * `intent_version` or any reservation. A Zoho failure therefore cannot revert a
 * confirmed booking, release a slot or unconfirm the visitor — structurally, not by
 * discipline.
 *
 * Node creates no Contact, Account, Deal or Quote. The integration layer has no
 * function to do it, and `processLead` owns the commercial graph.
 */

const LEAD_SOURCE = process.env.ZOHO_LEAD_SOURCE || 'Website';

/**
 * Marketing consent has a DIFFERENT api_name per module — verified against live
 * metadata on 2026-08-02 and pinned by `tests/zoho-field-names.test.js`:
 *
 *   Leads    -> Contact_Marketing_Consent   (label "Contact Marketing Consent")
 *   Contacts -> Marketing_Consent           (label "Marketing Consent")
 *
 * Sending the Lead name on a Contact update is an INVALID_DATA rejection, which
 * `classify()` treats as terminal — it would escalate the journey rather than fail
 * quietly. The map is the single source of truth for both call sites.
 */
const CONSENT_FIELD = { Leads: 'Contact_Marketing_Consent', Contacts: 'Marketing_Consent' };

/**
 * May this journey's Lead id still be sent as a person (`Who_Id` on an Event)?
 *
 * `Who_Id` is a CONTACT lookup. A CONVERTED Lead id is rejected with HTTP 400 /
 * INVALID_DATA, which `classify()` treats as TERMINAL — so it escalates the journey to
 * `meeting_create_failed` rather than retrying, and the booking never gets a Meeting at
 * all. The test is therefore not "do we believe it is converted" but "can we PROVE it is
 * not".
 *
 * Only two states are proof:
 *
 *   not_sent  — the workflow-enabled update has never been issued, so `processLead` has
 *               never run and no conversion can have started.
 *   rejected  — that update was refused TERMINALLY by Zoho, so the workflow never fired.
 *
 * Every other state means the update may already have landed:
 *
 *   sending          — committed BEFORE the request leaves, precisely so a lost response
 *                      cannot be replayed. Zoho may already have it.
 *   accepted         — conversion is under way by definition.
 *   outcome_unknown  — the request may have arrived; recovery is read-only for exactly
 *                      this reason.
 *   unresolved       — we gave up establishing what happened.
 *
 * REGRESSION (production, journey ef6397f4 on 2026-08-03, reproduced 2026-08-09): this
 * was keyed on `accepted` alone, so the ~700ms `sending` window was wide open. A booking
 * confirmed inside that window sent a Lead id that `processLead` had already converted,
 * and the demo reached the calendar with no Meeting in the CRM. Verified against the live
 * org: no `Who_Id` creates, a Contact `Who_Id` creates, a converted Lead `Who_Id` 400s.
 */
function leadStillAddressable(j) {
  return ['not_sent', 'rejected'].includes(j.lead_terminal_update_state);
}

/**
 * The ONE product whose Deal this journey's Meeting anchors to via `What_Id`.
 *
 * `meeting_anchor_product` is derived at page-2 commit in canonical order, whose last
 * entry is Partnership — so a mixed booking anchors on a B2B Deal.
 *
 * A row written before migration 0005 has NULL and deliberately keeps the OLD
 * tick-order answer. `meetingCreate` and `dealReconcile` run in separate passes; if a
 * journey created its Meeting under one rule and reconciled under the other,
 * `alreadyLinked` would not short-circuit and a triggers-enabled PUT would fire WF007
 * again against a different Deal. Falling back to `primaryProduct` rather than to the
 * new rule is what makes this deploy no-regression for every journey in flight.
 */
function meetingAnchor(j) {
  return j.meeting_anchor_product || primaryProduct(j);
}

/**
 * The manage URL for a CRM-facing Description, or null.
 *
 * `manageUrlFor` normally derives its host from the request; the worker has no request,
 * which is why this line has never actually appeared on a Meeting. `publicBaseUrl`
 * already tolerates a null `req` when `PUBLIC_BASE_URL` is set, so passing null is
 * sound — but ONLY then. Without it the helper would fall back to `https://jurnii.io`,
 * and a preview deployment would write a production-looking link, signed with the
 * preview's secret, into a production CRM record. No host, no line.
 */
function workerManageUrl(j) {
  if (!process.env.PUBLIC_BASE_URL) return null;
  return manageUrlFor(null, { journeyId: j.journey_id, email: j.email_normalized });
}

function classify(err) {
  if (err instanceof Z.ZohoError) {
    // `detail` is Zoho's own error code plus the FIELD NAMES it refused, and nothing
    // else. The reason ledger still records only a fixed code; this exists so the
    // application log can say which field, instead of a bare `zoho_http_400` that has to
    // be bisected against the live org.
    const detail = Z.describeZohoError(err);
    if (err.terminal) return { kind: 'terminal', code: err.code, retryAfter: null, detail };
    return { kind: 'retryable', code: err.code, retryAfter: err.retryAfterSeconds, detail };
  }
  return { kind: 'retryable', code: 'zoho_unknown_error', retryAfter: null, detail: null };
}

/** The full data-load payload, sent SUPPRESSED so no conversion is initiated. */
function dataLoadPayload(j, { includeCompany = true, module = 'Leads', existingProducts = null } = {}) {
  const p = {
    First_Name: j.first_name,
    Last_Name: j.last_name,
    Email: j.email,
    /**
     * The journey's own Lead Source, else the configured public default.
     *
     * Only an internal `/admin-form` booking carries one: the page-2 endpoint accepts
     * `leadSource` solely for a journey whose stored `form_placement` is
     * `internal-booking`, and validates it against live picklist metadata. A public
     * booking therefore always reads `ZOHO_LEAD_SOURCE` exactly as before.
     */
    Lead_Source: j.lead_source || LEAD_SOURCE,
  };
  const isLead = module === 'Leads';
  if (includeCompany && j.company) p.Company = j.company;
  if (j.phone_e164) p.Phone = j.phone_e164;
  if (j.job_title_raw) {
    p[process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw'] = j.job_title_raw;
    /**
     * The GOVERNED picklist, written only on an exact match against live metadata.
     *
     * `processLead.deluge` resolves `Contact_Role1` from `Job_Title`, not from
     * `Job_Title_Raw` — so while this field went unwritten, every booking-sourced Lead
     * reached conversion with a blank Contact Role and never met the activation gate.
     * Writing it here is what makes the EXISTING Deluge mapping fire.
     *
     * `governedTitle` returns null for the ~260 persona titles that are not live
     * picklist values, and for any `Other` free text. Omitting the key is essential
     * rather than tidy: an unknown value in a picklist field makes the whole update
     * INVALID_DATA, which would void the phone, company and consent in the same map.
     */
    const governed = governedTitle(j.job_title_raw, module);
    if (governed) p.Job_Title = governed;
  }
  /**
   * `Country` and `Product_Interest` are LEAD-ONLY api_names — neither exists on
   * Contacts (live metadata 2026-08-02: Contacts has `Mailing_Country`, and product
   * interest lives in the `Products_Linked` junction that `processLead` populates).
   *
   * Sending them on the Contact path made the ENTIRE update INVALID_DATA, which
   * `classify()` treats as terminal. That path runs whenever identity resolves to an
   * existing Contact — a returning visitor — so the update carrying their phone, job
   * title AND marketing consent was rejected wholesale, not merely missing a field.
   * Latent until now only because every journey so far created a new Lead.
   *
   * Product_Interest is a multiselectpicklist (jsonarray) on Leads: a bare string is
   * rejected with INVALID_DATA (expected_data_type: jsonarray), so the whole selection
   * is sent as an array of already-canonical values.
   *
   * A Zoho multiselect write REPLACES. `existingProducts` is the record's current
   * value, read by the caller on the one path that updates an existing Lead, so a
   * returning visitor's earlier product interests are preserved rather than clobbered.
   * It is null on the create path (nothing to preserve) and whenever the read failed,
   * in which case this degrades to the previous replace behaviour rather than blocking
   * the write.
   */
  if (isLead && j.country_name) p.Country = j.country_name;
  if (isLead) {
    const products = productList(j);
    if (products.length) p.Product_Interest = mergeMultiSelect(existingProducts, products);
  }
  /**
   * Marketing consent — WRITE-TRUE-ONLY.
   *
   * The visitor's consent was captured in Postgres and then dropped on the floor: this
   * payload never carried it, so every Lead and Contact read
   * `Contact_Marketing_Consent = false` no matter what the visitor ticked.
   *
   * Only `true` is ever emitted. Omitting the key on a false/absent consent is what
   * makes "never downgrade an existing true" structural rather than a race: this
   * payload is used for the Lead create, the convergent Lead update AND the
   * post-conversion Contact update, so sending `false` on any of them could overwrite
   * a `true` recorded by another channel between our read and our write. A brand-new
   * record simply keeps Zoho's own `false` default, which is the same two-state
   * outcome. An incoming `true` therefore upgrades an empty or false value, and
   * nothing this code sends can ever clear one.
   */
  const consentField = CONSENT_FIELD[module];
  if (j.marketing_consent === true && consentField) p[consentField] = true;
  return p;
}

// ---------------------------------------------------------------------------
// Identity — reads only, in the required order
// ---------------------------------------------------------------------------

async function identityResolve(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.email_normalized) return { kind: 'parked_precondition', errorCode: 'no_email' };

  try {
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length > 1) {
      await db.withTransaction((tx) => ZS.Z2_identityAmbiguous(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }
    if (contacts.length === 1) {
      // An existing Contact NEVER causes a Lead to be created, and Leads are not even
      // searched — searching them invites the duplicate this rule exists to prevent.
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'contact_reused', recordType: 'Contact', recordId: contacts[0].id,
        contactId: contacts[0].id,
      }));
      return { kind: 'progress', recorded: true };
    }

    const leads = await Z.searchUnconvertedLeadsByEmail(j.email_normalized);
    if (leads.length > 1) {
      await db.withTransaction((tx) => ZS.Z2_identityAmbiguous(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }
    if (leads.length === 1) {
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'lead_reused', recordType: 'Lead', recordId: leads[0].id,
      }));
      return { kind: 'progress', recorded: true };
    }
    await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
      outcome: 'new_lead_required', recordType: null, recordId: null,
    }));
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_identity_resolve', code: 'identity_resolve_failed', status: 'failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

// ---------------------------------------------------------------------------
// The one suppressed write per path
// ---------------------------------------------------------------------------

async function recordWrite(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.zoho_identity_outcome) return { kind: 'parked_precondition', errorCode: 'no_identity' };

  // Never a second create for the same journey. `create_attempts` is capped at 1 and is
  // never reset for this op, by repository assertion.
  if (j.zoho_identity_outcome === 'new_lead_required' && claim.create_attempts >= 1
      && !j.zoho_record_id) {
    return recoverUncertainLead(claim, j);
  }

  try {
    if (j.zoho_identity_outcome === 'contact_reused') {
      // Contacts carry company via the Account lookup, so Company is omitted.
      await Z.updateContactSuppressed(j.zoho_contact_id,
        dataLoadPayload(j, { includeCompany: false, module: 'Contacts' }));
      await db.withTransaction((tx) => ZS.Z4_contactWritten(tx, journeyId));
      return { kind: 'progress', recorded: true };
    }

    if (j.zoho_identity_outcome === 'lead_reused') {
      await Z.updateLeadSuppressed(j.zoho_record_id, dataLoadPayload(j));
      await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId: j.zoho_record_id }));
      return { kind: 'progress', recorded: true };
    }

    // new_lead_required: ONE suppressed create with the COMPLETE payload. The armed
    // protocol commits `sending` and increments the latch BEFORE the request leaves,
    // so a lost response can never authorise a second create.
    await db.withTransaction((tx) => O.incrementCreateAttempts(tx, journeyId, 'zoho_record_write'));
    const result = await Z.createLeadSuppressed(dataLoadPayload(j));
    const recordId = result.ok ? result.id : result.duplicateId;
    if (!recordId) throw new Z.ZohoError('zoho_write_no_id');
    await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId }));
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (j.zoho_identity_outcome === 'new_lead_required' && c.kind !== 'terminal') {
      // Uncertain create: latch at `outcome_unknown`, which `ensureOp` can never revive.
      await db.withTransaction((tx) => O.markOutcomeUnknown(tx, journeyId, 'zoho_record_write'));
      return { kind: 'no_progress', errorCode: c.code };
    }
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_record_write', code: 'record_write_failed', status: 'failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

/** Read-only recovery for an uncertain Lead create. Never creates again. */
async function recoverUncertainLead(claim, j) {
  const journeyId = claim.journey_id;
  const deadline = claim.unknown_since
    && new Date(claim.unknown_since).getTime() + ZS.zohoRecoveryWindowMinutes() * 60000;
  try {
    // Contact-first, then unconverted Leads — the same order as identity resolution,
    // because the create may have landed and then been converted.
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length === 1) {
      await db.withTransaction((tx) => ZS.Z1_identityResolved(tx, journeyId, {
        outcome: 'contact_reused', recordType: 'Contact', recordId: contacts[0].id, contactId: contacts[0].id }));
      return { kind: 'progress', recorded: true };
    }
    const leads = await Z.searchUnconvertedLeadsByEmail(j.email_normalized);
    if (leads.length === 1) {
      await db.withTransaction((tx) => ZS.Z3_leadWritten(tx, journeyId, { recordId: leads[0].id }));
      return { kind: 'progress', recorded: true };
    }
    if (deadline && Date.now() >= deadline) {
      // No second Lead create, ever.
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_record_write', code: 'lead_create_outcome_unknown' }));
      return { kind: 'progress', recorded: true };
    }
    // A single empty result is never sufficient — indexing lags.
    return { kind: 'no_progress', errorCode: 'lead_not_found_yet' };
  } catch (err) {
    return { kind: 'retryable_failure', errorCode: classify(err).code };
  }
}

// ---------------------------------------------------------------------------
// The single workflow-enabled Lead update — at most once, never resent
// ---------------------------------------------------------------------------

async function leadTerminalUpdate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j || !j.zoho_record_id) return { kind: 'parked_precondition', errorCode: 'no_lead' };

  // The parent latch is the authoritative prohibition. Any state past `not_sent` means
  // a send was already attempted, and an uncertain outcome is just as final as a
  // confirmed one for this purpose.
  if (j.lead_terminal_update_state !== 'not_sent') {
    log({ evt: 'zoho.lead_update.refused_resend', journeyId, state: j.lead_terminal_update_state });
    return { kind: 'parked_precondition', errorCode: 'already_attempted' };
  }

  /**
   * Best-effort enrichment read, BEFORE the latch.
   *
   * A Zoho multiselect write replaces, so preserving a returning visitor's existing
   * `Product_Interest` requires reading it first. Ordering is the whole point: the
   * latch below permits exactly one send ever, so a read that failed AFTER it would
   * burn the only allowed write. Here, a failure costs nothing — `existingProducts`
   * stays null and the payload degrades to a plain replace, which is what this code
   * did before the merge existed.
   */
  let existingProducts = null;
  try {
    const lead = await Z.getLead(j.zoho_record_id);
    if (lead && lead.Product_Interest) existingProducts = lead.Product_Interest;
  } catch (err) {
    log({ evt: 'zoho.lead_update.enrichment_read_failed', journeyId, code: classify(err).code });
  }

  try {
    // Committed BEFORE the request leaves. If the process dies here the command
    // executes zero times and we conservatively never retry.
    await db.withTransaction((tx) => ZS.markLeadUpdateSending(tx, journeyId));
  } catch (err) {
    return { kind: 'parked_precondition', errorCode: 'already_attempted' };
  }

  try {
    await Z.updateLeadWorkflowEnabled(j.zoho_record_id, dataLoadPayload(j, { existingProducts }));
    await db.withTransaction((tx) => ZS.Z5_leadUpdateAccepted(tx, journeyId));
    log({ evt: 'zoho.lead_update.accepted', journeyId });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal') {
      await db.withTransaction(async (tx) => {
        await J.patchZoho(tx, journeyId, { lead_terminal_update_state: 'rejected' });
        await ZS.Z10_escalate(tx, journeyId, { op: 'zoho_lead_terminal_update', code: 'record_write_failed' });
      });
      return { kind: 'progress', recorded: true };
    }
    // Uncertain: the request MAY have arrived and started processLead. Recover through
    // reads only.
    await db.withTransaction((tx) => ZS.Z6_leadUpdateUncertain(tx, journeyId));
    log({ evt: 'zoho.lead_update.uncertain', journeyId });
    return { kind: 'progress', recorded: true };
  }
}

// ---------------------------------------------------------------------------
// Conversion discovery — read-only, deadline-bound, on BOTH paths
// ---------------------------------------------------------------------------

async function conversionDiscover(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  const deadlineReached = claim.deadline_at && new Date(claim.deadline_at).getTime() <= Date.now();

  try {
    if (j.zoho_record_id) {
      const lead = await Z.getLead(j.zoho_record_id);
      const conv = Z.readConversion(lead);
      if (conv.converted && conv.contactId) {
        await db.withTransaction((tx) => ZS.Z7_conversionDiscovered(tx, journeyId,
          { contactId: conv.contactId, accountId: conv.accountId }));
        return { kind: 'progress', recorded: true };
      }
    }
    // Fall back to a Contact search: conversion may be visible there first.
    const contacts = await Z.searchContactsByEmail(j.email_normalized);
    if (contacts.length === 1) {
      await db.withTransaction((tx) => ZS.Z7_conversionDiscovered(tx, journeyId, {
        contactId: contacts[0].id, accountId: Z.accountIdOfContact(contacts[0]),
      }));
      return { kind: 'progress', recorded: true };
    }

    if (deadlineReached) {
      // The two exits differ by what the SEND outcome was, not by what the reads found.
      if (j.lead_terminal_update_state === 'outcome_unknown') {
        await db.withTransaction((tx) => J.T4_conversionUndiscovered(tx, journeyId));
      } else {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_conversion_discover', code: 'conversion_not_discovered' }));
      }
      return { kind: 'progress', recorded: true };
    }
    // A successful read that found nothing yet. Consumes no budget; bounded by the deadline.
    return { kind: 'no_progress', errorCode: 'not_converted_yet' };
  } catch (err) {
    return { kind: 'retryable_failure', errorCode: classify(err).code };
  }
}

// ---------------------------------------------------------------------------
// Meeting — one per journey, ever
// ---------------------------------------------------------------------------

async function meetingCreate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  // Cancel intent outranks normal Meeting creation (§7.3).
  if (['pending', 'completed'].includes(j.cancel_intent_state)) {
    return { kind: 'parked_precondition', errorCode: 'cancel_intent_pending' };
  }
  if (j.booking_status !== 'confirmed') {
    return { kind: 'parked_precondition', errorCode: 'awaiting_google_confirmation' };
  }
  /**
   * The Meeting waits for a USABLE CRM IDENTITY, not for the whole commercial graph.
   *
   * This used to demand `zoho_status ∈ {record_saved, meeting_created, complete}`.
   * That conflates "we have someone to attach the Meeting to" with "the Lead write
   * finished", and it is why two Production journeys escalated
   * `meeting_create_failed` while holding a perfectly good Contact, Account and
   * confirmed Google event: the Meeting was never attempted, so no Meeting existed to
   * fail. A confirmed booking with a person we can address must get its Meeting.
   *
   * A usable identity is a Contact, or a Lead we can PROVE is still unconverted —
   * see `leadStillAddressable`. Anything else falls through to the `contactPending`
   * wait below.
   */
  const hasContact = Boolean(j.zoho_contact_id);
  const hasAddressableLead = Boolean(j.zoho_record_id) && leadStillAddressable(j);
  if (!hasContact && !hasAddressableLead) {
    // No person yet. G1 created this op; Z4/Z5 reactivate it once identity lands.
    return { kind: 'parked_precondition', errorCode: 'awaiting_record_saved' };
  }
  if (j.zoho_meeting_id) return { kind: 'progress' };

  /**
   * `Who_Id` on an Event is a CONTACT lookup, and a CONVERTED Lead id is rejected with
   * INVALID_DATA — which is terminal, so it escalated the journey instead of retrying.
   *
   * `processLead` converts the Lead within seconds of the workflow-enabled update, and
   * Z5 arms this op and `zoho_conversion_discover` in the SAME transaction at the SAME
   * `op_priority` (both 40). This op therefore routinely won the race and addressed a
   * Lead that had just stopped being addressable. That is what suppressed every
   * Meeting in production.
   *
   * CURRENTLY UNREACHABLE, and kept deliberately as defence in depth. The guard above
   * already parks (`awaiting_record_saved`) whenever there is no Contact and no
   * provably-unconverted Lead, which is every case that would reach here — verified
   * exhaustively over all 24 combinations of {Contact, Lead, the six
   * `lead_terminal_update_state` values}. Z5 and Z7 re-arm the op, so a parked journey
   * still gets its Meeting once the Contact is discovered.
   *
   * It stays because it is the second line of the SAME defence: if the addressability
   * gate above is ever loosened, this stops a Lead id mid-conversion reaching `Who_Id`
   * anyway. Do not delete it to "remove dead code" without re-checking that gate.
   */
  const contactPending = !j.zoho_contact_id && !leadStillAddressable(j);
  if (contactPending) {
    const discover = await db.withTransaction((tx) => O.getOp(tx, journeyId, 'zoho_conversion_discover'));
    if (discover && !['done', 'terminal'].includes(discover.state)) {
      return { kind: 'no_progress', errorCode: 'awaiting_contact' };
    }
  }

  try {
    // Reuse by the correlation key before creating — the recovery path for an uncertain
    // create, and also what makes a retry safe.
    const existing = await Z.searchEventByExternalId(journeyId);
    if (existing) {
      if (!zohoEventOwned(existing, journeyId)) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_meeting_create', code: 'correlation_conflict' }));
        return { kind: 'progress', recorded: true };
      }
      await db.withTransaction((tx) => ZS.Z8_meetingCreated(tx, journeyId, { meetingId: existing.id }));
      return { kind: 'progress', recorded: true };
    }

    if (claim.create_attempts >= 1) {
      // An uncertain create already happened. NEVER a second Meeting: a duplicate
      // fires WF007 twice and corrupts pipeline automation.
      const deadline = claim.unknown_since
        && new Date(claim.unknown_since).getTime() + ZS.zohoRecoveryWindowMinutes() * 60000;
      if (deadline && Date.now() >= deadline) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_meeting_create', code: 'meeting_create_outcome_unknown' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'meeting_not_found_yet' };
    }

    // A Deal is linked at create ONLY when the final Contact is already known.
    let dealId = null;
    // A Meeting links to ONE Deal (`What_Id`), so one product resolves it. The FULL
    // selected scope travels separately in `Meeting_Task_Contract_Products`.
    const anchor = meetingAnchor(j);
    if (j.zoho_contact_id && j.zoho_account_id && anchor) {
      const resolved = await Z.resolveProductDeal(j.zoho_account_id, anchor);
      if (resolved.status === 'one') dealId = resolved.deal.id;
    }

    await db.withTransaction((tx) => O.incrementCreateAttempts(tx, journeyId, 'zoho_meeting_create'));
    const payload = Z.buildMeetingPayload({
      journeyId,
      title: meetingTitleFor(j),
      startIso: j.slot_start_utc, endIso: j.slot_end_utc,
      contactId: j.zoho_contact_id,
      // Only a PROVABLY unconverted Lead may be sent as a person — see
      // `leadStillAddressable`. Once the conversion-triggering update has left, the id
      // may already belong to a converted Lead, which Zoho rejects terminally.
      leadId: (j.zoho_contact_id || !leadStillAddressable(j)) ? null : j.zoho_record_id,
      dealId,
      meetLink: j.google_meet_url,
      // Every selected product, canonical and ordered — this is the Meeting's structured
      // product scope, not just the one that resolved a Deal.
      products: orderedProducts(j),
      manageUrl: workerManageUrl(j),
    });
    const result = await Z.createEventSuppressed(payload);
    const meetingId = result.ok ? result.id : result.duplicateId;
    if (!meetingId) throw new Z.ZohoError('zoho_write_no_id');
    await db.withTransaction((tx) => ZS.Z8_meetingCreated(tx, journeyId, { meetingId }));
    log({ evt: 'zoho.meeting.created', journeyId, dealLinked: Boolean(dealId) });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal') {
      // The reason ledger only records `meeting_create_failed`, so without this the
      // ACTUAL Zoho code is discarded and the escalation says nothing about the cause.
      // A safe code, never a third-party message.
      log({ evt: 'zoho.meeting.create_rejected', journeyId, code: c.code, detail: c.detail });
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_meeting_create', code: 'meeting_create_failed' }));
      return { kind: 'progress', recorded: true };
    }
    await db.withTransaction((tx) => O.markOutcomeUnknown(tx, journeyId, 'zoho_meeting_create'));
    return { kind: 'no_progress', errorCode: c.code };
  }
}

// ---------------------------------------------------------------------------
// Deal reconciliation — the retro-link
// ---------------------------------------------------------------------------

async function dealReconcile(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };
  if (['pending', 'completed'].includes(j.cancel_intent_state)) {
    return { kind: 'parked_precondition', errorCode: 'cancel_intent_pending' };
  }

  // Both prerequisites, explicitly. A Lead id in the Contact position silently
  // mis-routes `routeContactSequence`, so the Contact must be DISCOVERED first.
  if (!j.zoho_contact_id) return { kind: 'no_progress', errorCode: 'awaiting_contact' };
  if (!j.zoho_meeting_id) return { kind: 'no_progress', errorCode: 'awaiting_meeting' };

  const deadlineReached = claim.deadline_at && new Date(claim.deadline_at).getTime() <= Date.now();

  try {
    const accountId = j.zoho_account_id
      || Z.accountIdOfContact(await Z.getContact(j.zoho_contact_id));
    if (!accountId) {
      if (deadlineReached) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_deal_reconcile', code: 'product_unresolved' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'awaiting_account' };
    }

    // The SAME anchor as at Meeting create — the retro-link must resolve the same Deal
    // the Meeting was (or would have been) linked to. A different answer here would
    // defeat `alreadyLinked` below and, with automation armed, fire WF007 a second time
    // against a second Deal.
    const resolved = await Z.resolveProductDeal(accountId, meetingAnchor(j));
    if (resolved.status === 'many') {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_deal_reconcile', code: 'duplicate_product_deal' }));
      return { kind: 'progress', recorded: true };
    }
    if (resolved.status !== 'one') {
      if (deadlineReached) {
        await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
          { op: 'zoho_deal_reconcile', code: 'product_unresolved' }));
        return { kind: 'progress', recorded: true };
      }
      return { kind: 'no_progress', errorCode: 'deal_not_visible_yet' };
    }

    /**
     * ONE PUT applying Contact and Deal TOGETHER. Both keys always travel together —
     * WF007's first guard returns early unless `What_Id` is set AND
     * `$se_module === 'Deals'`, and a Lead id in the Contact position mis-routes
     * `routeContactSequence`. The linkage is identical in both modes; only the
     * TRIGGER differs, which is precisely the persistence/automation seam.
     */
    const triggersEnabled = retroLinkTriggersEnabled(process.env);
    const alreadyLinked = j.zoho_deal_id === resolved.deal.id
      && j.zoho_meeting_activation_state === activationStateForLink(process.env);
    if (alreadyLinked) {
      // A repeat pass in suppressed mode must make NO further Zoho write once the
      // Meeting is already correctly linked.
      await db.withTransaction((tx) => ZS.Z9_dealLinked(tx, journeyId,
        { dealId: resolved.deal.id, activationState: activationStateForLink(process.env) }));
      return { kind: 'progress', recorded: true };
    }

    await Z.updateEvent(j.zoho_meeting_id, {
      Who_Id: { id: j.zoho_contact_id },
      What_Id: { id: resolved.deal.id },
      $se_module: 'Deals',
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled });

    await db.withTransaction((tx) => ZS.Z9_dealLinked(tx, journeyId, {
      dealId: resolved.deal.id,
      activationState: activationStateForLink(process.env),
    }));
    log({ evt: 'zoho.deal.linked', journeyId, activation: activationStateForLink(process.env) });
    return { kind: 'progress', recorded: true };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      // Same reasoning as the Meeting create: the ledger records a fixed reason code, so
      // without this the actual Zoho refusal is lost and the escalation says nothing
      // about which field caused it.
      log({ evt: 'zoho.deal.link_rejected', journeyId, code: c.code, detail: c.detail });
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_deal_reconcile', code: 'deal_reconcile_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

// ---------------------------------------------------------------------------
// Propagation
// ---------------------------------------------------------------------------

async function cancelPropagate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };

  // Belt and braces: re-assert the precondition on every claim. G4 reactivates this op.
  if (j.booking_status !== 'cancelled' || j.google_status !== 'cancelled') {
    return { kind: 'parked_precondition', errorCode: 'awaiting_google_cancellation' };
  }
  if (!j.zoho_meeting_id) {
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'booking_cancelled'));
    return { kind: 'progress' };
  }

  try {
    // The audit-only representation of §7.2, until the approved Deluge correction ships.
    await Z.updateEvent(j.zoho_meeting_id, {
      Meeting_Task_State: 'Lost',
      Meeting_Task_Lost_Reasons: 'No Meeting / Demo',
      Meeting_Task_Status: 'Closed',
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled: false });
    await db.withTransaction((tx) => RV.addReviewReason(tx, journeyId, 'booking_cancelled'));
    return { kind: 'progress' };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_cancel_propagate', code: 'cancel_propagation_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

async function reschedulePropagate(claim) {
  const journeyId = claim.journey_id;
  const j = await db.withTransaction((tx) => J.get(tx, journeyId));
  if (!j) return { kind: 'parked_precondition', errorCode: 'no_journey' };
  if (!j.zoho_meeting_id) return { kind: 'parked_precondition', errorCode: 'no_meeting' };

  try {
    // The SAME Meeting's times are updated. A still-person-linked Meeting is updated
    // without fabricating a Deal.
    await Z.updateEvent(j.zoho_meeting_id, {
      Start_DateTime: Z.formatZohoDateTime(j.slot_start_utc),
      End_DateTime: Z.formatZohoDateTime(j.slot_end_utc),
      Ext_Calendar_Booking_ID: journeyId,
    }, { triggersEnabled: false });
    log({ evt: 'zoho.reschedule.propagated', journeyId });
    return { kind: 'progress' };
  } catch (err) {
    const c = classify(err);
    if (c.kind === 'terminal' || claim.failure_count + 1 >= claim.max_failures) {
      await db.withTransaction((tx) => ZS.Z10_escalate(tx, journeyId,
        { op: 'zoho_reschedule_propagate', code: 'reschedule_propagation_failed' }));
      return { kind: 'progress', recorded: true };
    }
    return { kind: 'retryable_failure', errorCode: c.code, retryAfterSeconds: c.retryAfter };
  }
}

module.exports = {
  identityResolve,
  recordWrite,
  leadTerminalUpdate,
  conversionDiscover,
  meetingCreate,
  dealReconcile,
  cancelPropagate,
  reschedulePropagate,
  dataLoadPayload,
  classify,
  leadStillAddressable,
};
