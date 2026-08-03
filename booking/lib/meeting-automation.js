'use strict';

/**
 * Whether a confirmed booking's Zoho Meeting may ACTIVATE the commercial automation.
 *
 * Meeting PERSISTENCE and Meeting AUTOMATION are two separate things and this flag is
 * the seam between them. The Meeting record — its existence, its correlation key, its
 * Contact and Deal linkage — is the durable business artefact and is always written.
 * Activation is the single triggers-enabled write that lets WF007 (`handleMeetingEvent`)
 * see the Event and drive stage advancement, reminder fields and sequence email.
 *
 * `BOOKING_MEETING_AUTOMATION_ENABLED` must be exactly `true` to activate. Absent,
 * empty, `false` or anything else means suppressed — the fail-safe direction, matching
 * `RETENTION_EXECUTION_ENABLED`. A freshly deployed environment therefore writes
 * complete, correctly linked Meetings and fires no downstream automation until an
 * operator deliberately arms it.
 *
 * Suppression is a NORMAL terminal outcome, not a failure: the journey reaches
 * integration-complete with `zoho_meeting_activation_state = 'suppressed'` and raises
 * no Manual Review. `meeting_create_failed` is reserved for a Meeting that could not be
 * created or verified.
 */
function meetingAutomationEnabled(env) {
  return String((env || process.env).BOOKING_MEETING_AUTOMATION_ENABLED || '').toLowerCase() === 'true';
}

/** The activation state a completed retro-link lands in, given the flag. */
function activationStateForLink(env) {
  return meetingAutomationEnabled(env) ? 'complete' : 'suppressed';
}

/**
 * Whether the retro-link write may enable triggers. This is the ONLY place in the
 * codebase permitted to answer yes, so "did we fire WF007?" has one auditable source.
 */
function retroLinkTriggersEnabled(env) {
  return meetingAutomationEnabled(env);
}

const ACTIVATION_STATES = Object.freeze([
  'not_requested',    // no Meeting yet
  'suppressed',       // Meeting created + linked, automation deliberately not invoked
  'pending',          // activation wanted, not yet attempted
  'sending',          // triggers-enabled write in flight
  'accepted',         // Zoho accepted the triggers-enabled write
  'outcome_unknown',  // the write's outcome could not be established
  'complete',         // activation done and WF007 was given the Event
]);

module.exports = {
  meetingAutomationEnabled,
  activationStateForLink,
  retroLinkTriggersEnabled,
  ACTIVATION_STATES,
};
