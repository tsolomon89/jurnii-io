'use strict';

/**
 * §8 — Meeting-only mode and the `create_meeting_only` repair, against real Postgres
 * with the Zoho transport stubbed so every outbound write is inspectable.
 *
 * The property under test is the seam: the Meeting record and its linkage are always
 * written, while the ONE triggers-enabled write that wakes WF007 is gated. A suppressed
 * journey must reach integration-complete and raise no Manual Review — suppression is a
 * configuration choice, never a failure.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');

const db = require('../../db');
const J = require('../../db/queries/journeys');
const O = require('../../db/queries/ops');
const RV = require('../../db/queries/review');
const ZS = require('../../db/queries/zoho-state');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

const created = new Set();
let seq = 0;

// --- Zoho transport stub -----------------------------------------------------
const zohoPath = require.resolve('../../integrations/zoho');
const Z = require(zohoPath);
const realEvent = {
  searchEventByExternalId: Z.searchEventByExternalId,
  createEventSuppressed: Z.createEventSuppressed,
  updateEvent: Z.updateEvent,
  resolveProductDeal: Z.resolveProductDeal,
  getContact: Z.getContact,
};
let calls;
function stubZoho({ existingMeeting = null, deal = { status: 'none' }, contact = { id: 'C1' } } = {}) {
  calls = { search: 0, create: [], update: [] };
  Z.searchEventByExternalId = async () => { calls.search += 1; return existingMeeting; };
  Z.createEventSuppressed = async (payload) => { calls.create.push(payload); return { ok: true, id: 'MEET1' }; };
  Z.updateEvent = async (id, data, opts) => { calls.update.push({ id, data, opts }); return { ok: true, id }; };
  Z.resolveProductDeal = async () => deal;
  Z.getContact = async () => contact;
}
function restoreZoho() { Object.assign(Z, realEvent); }

async function seedJourney(over = {}) {
  const id = crypto.randomUUID();
  created.add(id);
  const local = `mo.${process.pid}.${seq += 1}`;
  await db.withTransaction((tx) => J.upsertPage1(tx, id, {
    email: `${local}@example.test`, email_normalized: `${local}@example.test`,
    first_name: 'M', last_name: 'O', marketing_consent: false,
  }));
  await db.withTransaction(async (tx) => {
    await tx.query(
      `UPDATE booking_journeys SET booking_status='confirmed', google_status='confirmed',
              google_outcome_state='created', google_event_id=$2, google_calendar_id='cal@x',
              google_meet_url='https://meet.example/x', slot_start_utc=now()+interval '3 days',
              slot_end_utc=now()+interval '3 days 30 minutes', product_interest='Jurnii 360',
              zoho_status=$3, zoho_record_id=$4, zoho_contact_id=$5, zoho_account_id=$6,
              lead_terminal_update_state=$7
         WHERE journey_id=$1`,
      [id, `ev-${local}`, over.zoho_status || 'record_saved', over.zoho_record_id || null,
        over.zoho_contact_id || null, over.zoho_account_id || null,
        over.lead_terminal_update_state || 'not_sent']);
    await O.ensureOp(tx, id, 'zoho_meeting_create');
  });
  return id;
}
const row = (id) => db.withTransaction((tx) => J.get(tx, id));
const claim = async (id, op) => {
  const o = await db.withTransaction((tx) => O.getOp(tx, id, op));
  return { journey_id: id, op, create_attempts: o ? o.create_attempts : 0,
    failure_count: o ? o.failure_count : 0, max_failures: o ? o.max_failures : 8,
    deadline_at: o ? o.deadline_at : null, unknown_since: null };
};

test.after(async () => {
  restoreZoho();
  for (const id of created) {
    await db.withTransaction((tx) => tx.query('DELETE FROM booking_journeys WHERE journey_id=$1', [id])).catch(() => {});
  }
  await db.close().catch(() => {});
});

// ---------------------------------------------------------------------------

test('1+3+4: suppressed mode creates the Meeting and fires NO trigger', { skip }, async () => {
  delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
  const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
  stubZoho({ deal: { status: 'one', deal: { id: 'D1' } } });
  const ops = require('../../workflows/zoho-ops');

  await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
  assert.strictEqual(calls.create.length, 1, 'exactly one Meeting create');
  const r1 = await row(id);
  assert.strictEqual(r1.zoho_meeting_id, 'MEET1');

  await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
  assert.strictEqual(calls.update.length, 1, 'exactly one retro-link');
  const link = calls.update[0];
  // 2: Contact and Deal applied TOGETHER, suppressed.
  assert.strictEqual(link.data.Who_Id.id, 'C1');
  assert.strictEqual(link.data.What_Id.id, 'D1');
  assert.strictEqual(link.data.$se_module, 'Deals');
  assert.strictEqual(link.opts.triggersEnabled, false, 'WF007 must NOT be invoked');

  // 5: integration-complete, activation suppressed, and NO review reason.
  const r2 = await row(id);
  assert.strictEqual(r2.zoho_status, 'complete');
  assert.strictEqual(r2.zoho_meeting_activation_state, 'suppressed');
  assert.strictEqual(r2.needs_attention, false);
  const open = await db.withTransaction((tx) => RV.openReasonKeys(tx, id));
  assert.deepStrictEqual(open, [], 'suppression must raise no Manual Review');

  // 4: no email/sequence activation op exists at all.
  const allOps = await db.withTransaction(async (tx) => (await tx.query(
    'SELECT op FROM booking_journey_ops WHERE journey_id=$1', [id])).rows.map((x) => x.op));
  assert.strictEqual(allOps.some((o) => /email|sequence|activation/.test(o)), false);
  restoreZoho();
});

test('9: a repeat pass makes no further Zoho write once linked', { skip }, async () => {
  delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
  const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
  stubZoho({ deal: { status: 'one', deal: { id: 'D1' } } });
  const ops = require('../../workflows/zoho-ops');
  await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
  await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
  const afterFirst = { create: calls.create.length, update: calls.update.length };

  await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
  assert.strictEqual(calls.update.length, afterFirst.update, 'no second retro-link write');
  assert.strictEqual(calls.create.length, afterFirst.create, 'no second Meeting create');
  const r = await row(id);
  assert.strictEqual(r.zoho_meeting_id, 'MEET1');
  restoreZoho();
});

test('6+8: no Deal yet -> person-linked Meeting, and a Lead Who_Id never gets a What_Id', { skip }, async () => {
  delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
  // Unconverted Lead, no Contact: addressable, so the Meeting must still be created.
  const id = await seedJourney({ zoho_record_id: 'L1', lead_terminal_update_state: 'not_sent' });
  stubZoho({ deal: { status: 'one', deal: { id: 'D1' } } });
  const ops = require('../../workflows/zoho-ops');
  await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
  assert.strictEqual(calls.create.length, 1, 'a Lead-only journey still gets its Meeting');
  const payload = calls.create[0];
  const hasWhat = JSON.stringify(payload).includes('What_Id');
  assert.strictEqual(hasWhat, false, 'never a What_Id while Who_Id is a Lead');
  restoreZoho();
});

test('7: a later-discovered Deal retro-links SUPPRESSED', { skip }, async () => {
  delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
  const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
  stubZoho({ deal: { status: 'none' } });
  const ops = require('../../workflows/zoho-ops');
  await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
  await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
  assert.strictEqual(calls.update.length, 0, 'no link while the Deal is invisible');
  assert.strictEqual((await row(id)).zoho_deal_id, null);

  // The Deal appears.
  Z.resolveProductDeal = async () => ({ status: 'one', deal: { id: 'D9' } });
  await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
  assert.strictEqual(calls.update.length, 1);
  assert.strictEqual(calls.update[0].opts.triggersEnabled, false);
  const r = await row(id);
  assert.strictEqual(r.zoho_deal_id, 'D9');
  assert.strictEqual(r.zoho_meeting_activation_state, 'suppressed');
  restoreZoho();
});

test('13: enabling the flag restores the triggers-enabled activation path', { skip }, async () => {
  process.env.BOOKING_MEETING_AUTOMATION_ENABLED = 'true';
  try {
    const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
    stubZoho({ deal: { status: 'one', deal: { id: 'D1' } } });
    const ops = require('../../workflows/zoho-ops');
    await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
    await ops.dealReconcile(await claim(id, 'zoho_deal_reconcile'));
    assert.strictEqual(calls.update[0].opts.triggersEnabled, true, 'WF007 may run when armed');
    const r = await row(id);
    assert.strictEqual(r.zoho_status, 'complete');
    assert.strictEqual(r.zoho_meeting_activation_state, 'complete');
  } finally {
    delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
    restoreZoho();
  }
});

test('§4: a confirmed booking with usable identity is NOT escalated for a missing Deal',
  { skip }, async () => {
    delete process.env.BOOKING_MEETING_AUTOMATION_ENABLED;
    const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
    stubZoho({ deal: { status: 'none' } });
    const ops = require('../../workflows/zoho-ops');
    const res = await ops.meetingCreate(await claim(id, 'zoho_meeting_create'));
    assert.notStrictEqual(res.errorCode, 'awaiting_record_saved');
    assert.strictEqual(calls.create.length, 1);
    const r = await row(id);
    assert.strictEqual(r.needs_attention, false, 'an incomplete commercial graph is not meeting_create_failed');
    restoreZoho();
  });

// ---------------------------------------------------------------------------
// create_meeting_only (§5)
// ---------------------------------------------------------------------------

test('10+11+12: create_meeting_only re-arms, closes only meeting_create_failed, is idempotent',
  { skip }, async () => {
    const actions = require('../../workflows/operator-actions');
    const id = await seedJourney({ zoho_contact_id: 'C1', zoho_account_id: 'A1' });
    await db.withTransaction(async (tx) => {
      await RV.addReviewReason(tx, id, 'meeting_create_failed');
      await RV.addReviewReason(tx, id, 'identity_ambiguous');   // unrelated, must survive
      await RV.refreshAttention(tx, id);
    });

    assert.deepStrictEqual(actions.legalActions('mr1'), ['create_meeting_only']);
    assert.deepStrictEqual(actions.reasonsFor({ escalation: 'mr1' }), ['meeting_create_failed']);

    const journey = await row(id);
    const verified = { observed: { existingMeetingId: null, contactId: 'C1', leadId: null,
      accountId: 'A1', dealId: 'D1', googleEventId: journey.google_event_id } };
    const request = { journeyId: id, escalation: 'mr1', action: 'create_meeting_only' };

    const applyOnce = () => db.withTransaction(async (tx) => {
      const out = await actions.apply(tx, { request, journey, verified });
      // resolved_resolution_id has an FK to booking_operator_resolutions; null is the
      // correct value here because this test drives apply() directly, not the endpoint
      // that would have minted a resolution row.
      await RV.resolveReasons(tx, id, actions.reasonsFor(request), null,
        journey.manual_review_version);
      return out;
    });

    const first = await applyOnce();
    assert.strictEqual(first.contactId, 'C1');
    assert.strictEqual(first.meetingWriteDeferredToWorker, true);

    const opsNow = await db.withTransaction(async (tx) => (await tx.query(
      'SELECT op, state FROM booking_journey_ops WHERE journey_id=$1', [id])).rows);
    assert.ok(opsNow.some((o) => o.op === 'zoho_meeting_create' && o.state === 'pending'),
      'the Meeting op is re-armed for the worker');

    const open = await db.withTransaction((tx) => RV.openReasonKeys(tx, id));
    assert.strictEqual(open.some((k) => k.startsWith('meeting_create_failed')), false,
      'the target reason is closed');
    assert.ok(open.some((k) => k.startsWith('identity_ambiguous')),
      'unrelated reasons stay OPEN');

    // Idempotent: applying again changes nothing structurally.
    const second = await applyOnce();
    assert.deepStrictEqual(second.contactId, first.contactId);
    const opsAfter = await db.withTransaction(async (tx) => (await tx.query(
      'SELECT op FROM booking_journey_ops WHERE journey_id=$1', [id])).rows.length);
    assert.strictEqual(opsAfter, opsNow.length, 'no extra ops from a repeat');
  });
