Automated email template review drafts

Purpose

These are plain-text review drafts that rewrite every automated email the CRM automations can send, in the Jurnii brand voice. They are drafts for human review only. No live Zoho template was changed and no automation code was changed. Nothing here has been published.

How the automations send email

Every automated email is sent by one Deluge function, automation.sendSequencedEmail (v6/activity/sendSequencedEmail.deluge). It resolves a canonical key (stage slug, step, kind) to a Zoho server-side template id from an inline registry, then sends the template to the Contact via the Send Mail API. No email subject or body text lives in the code; the copy lives in the Zoho templates. The recipient is always the Deal's Contact. The from address is the Deal Owner, falling back to timothy@jurnii.io.

Send gates (apply to every email): idempotency by SendKey; the Contact must be readable; the send-time activation gate (Contact.Sequence_Activated_At must be set); the Contact must have an email; consent must not be Not Consented or Withdrawn; the Deal must resolve to the B2B pipeline (Partnership and unresolved are blocked); the template must resolve. Date-based senders also require Deal.Automation_Suppressed != true.

Scope: 41 templates referenced by the code, plus this index.

Merge fields available (only the bang form works; do not rename)
${!Contacts.First_Name}
${!Contacts.Account_Name.Account_Name}
${!org.company_name}
${!users.first_name}
${!userSignature}
${!users.website} (booking and reschedule link)
${!Contacts.Account_Name.Contract_URL} (proposal and terms link)
${!Contacts.Account_Name.Contract_Renewal_URL} (renewal link)

Voice decisions (agreed with the requester)
Balanced: keep the low-pressure, context-anchored structure, sharpen with Jurnii's calm-authority commercial vocabulary, and add one light category-level hook where it reads naturally. Late and transactional emails stay minimal.
Warm and cold opener semantics: no tag equals a new lead (first contact); warm equals an already-familiar contact (more direct); cold equals a contact who engaged before and then went quiet (reconnect, never referencing a specific prior call).

Safety line held in every draft: no product named (Jurnii UX, 360, Cortex), no competitor named, no per-recipient statistic, and no claim of a meeting, quote, agreement, or attendance that the trigger does not guarantee. iGaming category-level framing is used because every recipient is an iGaming operator.

Review index

Cadence families (5 steps each; sent by routeContactSequence as the activation opener at step 1, as call-not-connected side emails at steps 2 to 4, and as the scheduled post-call email at step 5)

Marketing Consent (top-of-funnel marketing qualification; a shallow, category-level pitch; call to action is a short conversation. The stage name is internal; the email does not ask for consent, which the send gate handles.)
marketing-consent:1:initial | id 991103000001478002 | file marketing-consent-1-initial.md | rewritten yes
marketing-consent:2:follow-up | id 991103000001467002 | file marketing-consent-2-follow-up.md | rewritten yes
marketing-consent:3:follow-up | id 991103000001484001 | file marketing-consent-3-follow-up.md | rewritten yes
marketing-consent:4:follow-up | id 991103000001474007 | file marketing-consent-4-follow-up.md | rewritten yes
marketing-consent:5:final | id 991103000001485001 | file marketing-consent-5-final.md | rewritten yes

Demo Booking (offer a walkthrough; call to action is book via ${!users.website})
demo-booking:1:initial | id 991103000001476004 | file demo-booking-1-initial.md | rewritten yes
demo-booking:2:follow-up | id 991103000001478005 | file demo-booking-2-follow-up.md | rewritten yes
demo-booking:3:follow-up | id 991103000001486001 | file demo-booking-3-follow-up.md | rewritten yes
demo-booking:4:follow-up | id 991103000001487001 | file demo-booking-4-follow-up.md | rewritten yes
demo-booking:5:final | id 991103000001478008 | file demo-booking-5-final.md | rewritten yes

Demo Hosted (demo recovery: a demo was scheduled but did not take place; see the note below)
demo-hosted:1:initial | id 991103000001476007 | file demo-hosted-1-initial.md | rewritten yes
demo-hosted:2:follow-up | id 991103000001470002 | file demo-hosted-2-follow-up.md | rewritten yes
demo-hosted:3:follow-up | id 991103000001477003 | file demo-hosted-3-follow-up.md | rewritten yes
demo-hosted:4:follow-up | id 991103000001471007 | file demo-hosted-4-follow-up.md | rewritten yes
demo-hosted:5:final | id 991103000001488001 | file demo-hosted-5-final.md | rewritten yes

Commercial Agreement (proposal has been sent; call to action is review via ${!Contacts.Account_Name.Contract_URL})
commercial-agreement:1:initial | id 991103000001480002 | file commercial-agreement-1-initial.md | rewritten yes
commercial-agreement:2:follow-up | id 991103000001469004 | file commercial-agreement-2-follow-up.md | rewritten yes
commercial-agreement:3:follow-up | id 991103000001486004 | file commercial-agreement-3-follow-up.md | rewritten yes
commercial-agreement:4:follow-up | id 991103000001483002 | file commercial-agreement-4-follow-up.md | rewritten yes
commercial-agreement:5:final | id 991103000001480005 | file commercial-agreement-5-final.md | rewritten yes

Renewal (existing client, renewal approaching; call to action is review via ${!Contacts.Account_Name.Contract_Renewal_URL})
renewal:1:initial | id 991103000001486007 | file renewal-1-initial.md | rewritten yes
renewal:2:follow-up | id 991103000001489001 | file renewal-2-follow-up.md | rewritten yes
renewal:3:follow-up | id 991103000001484004 | file renewal-3-follow-up.md | rewritten yes
renewal:4:follow-up | id 991103000001486010 | file renewal-4-follow-up.md | rewritten yes
renewal:5:final | id 991103000001484007 | file renewal-5-final.md | rewritten yes

Event emails (single-shot, guaranteed by the trigger)
demo-confirmation:0:confirmation | id 991103000001474010 | trigger meeting:created (handleMeetingEvent) | file demo-confirmation-0-confirmation.md | rewritten yes
demo-confirmation:0:reminder | id 991103000001487004 | trigger sendDemoReminder (WF010c, date-based) | file demo-confirmation-0-reminder.md | rewritten yes
demo-confirmation:0:no-show | id 991103000001476010 | trigger demo:noshow (handleMeetingEvent) | file demo-confirmation-0-no-show.md | rewritten yes
proposal-preparation:0:post-demo | id 991103000001484010 | trigger demo:qualified, demo attended (handleMeetingEvent) | file proposal-preparation-0-post-demo.md | rewritten yes
commercial-agreement:0:proposal-sent | id 991103000001475003 | trigger commercial:sent (processDeal) | file commercial-agreement-0-proposal-sent.md | rewritten yes
onboarding:0:signed-confirmation | id 991103000001488004 | trigger Onboarding floor-crossing, agreement signed (processDeal) | file onboarding-0-signed-confirmation.md | rewritten yes

Warm and cold opener variants (kind opener only; selected from the Activation Task note by resolveOpenerVariant; each swaps only the template id on the stage's step 1 initial)
marketing-consent:1:initial:warm | id 991103000002749002 | file marketing-consent-1-initial-warm.md | rewritten yes
marketing-consent:1:initial:cold | id 991103000002750001 | file marketing-consent-1-initial-cold.md | rewritten yes
demo-booking:1:initial:warm | id 991103000002751001 | file demo-booking-1-initial-warm.md | rewritten yes
demo-booking:1:initial:cold | id 991103000002752001 | file demo-booking-1-initial-cold.md | rewritten yes
demo-hosted:1:initial:warm | id 991103000002753001 | file demo-hosted-1-initial-warm.md | rewritten yes
demo-hosted:1:initial:cold | id 991103000002749005 | file demo-hosted-1-initial-cold.md | rewritten yes
commercial-agreement:1:initial:warm | id 991103000002754001 | file commercial-agreement-1-initial-warm.md | rewritten yes
commercial-agreement:1:initial:cold | id 991103000002755001 | file commercial-agreement-1-initial-cold.md | rewritten yes
renewal:1:initial:warm | id 991103000002756001 | file renewal-1-initial-warm.md | rewritten yes
renewal:1:initial:cold | id 991103000002757001 | file renewal-1-initial-cold.md | rewritten yes

Total: 41 templates, all rewritten. Every template id referenced by the code has exactly one review file.

Notes and things to resolve before publication

Marketing Consent is really marketing qualification. The stage is named Marketing Consent internally, but its emails are a shallow, top-of-funnel pitch that qualifies interest, not a request for permission to email. The seven affected drafts (the five cadence steps plus the warm and cold openers) were reframed accordingly: they pitch the intelligence-layer value at the category level (own experience plus competitors', tied to conversion, churn and NGR) and ask for a short conversation. Consent itself is enforced by the send-time gate, not by the email copy. The live template marketing-consent:1:initial (id 991103000001478002) was re-published with this reframed copy; the other six remain drafts.

Demo Hosted is demo recovery, not post-attendance. The live copy for demo-hosted:1 and :2 (and all three demo-hosted openers) is missed-demo reschedule wording ("we had a demo in the diary but didn't manage to connect"), updated 2026-06-25 per docs/v6/V6_EMAIL_COPY_VERIFICATION.md. This diverges from the older docs/v5/EMAIL_MANIFEST.md, which still shows "Next steps after your demo" for demo-hosted:1. The drafts follow the live intent and never claim the demo happened. The manifest is stale for these and should not be used as the source. Open question to confirm: are demo-hosted steps 3 to 5 also intended as demo-to-be-held (they were aligned to that reading here for safety, since the live 1 and 2 are), or is the family meant to shift to post-attendance follow-up partway through? All other families matched the live templates exactly.

Cold opener reframing. The live cold openers for marketing-consent and demo-booking read as brand-new leads ("you haven't heard from us before", "I don't think we've spoken yet"). Per the agreed semantics, cold means a contact who dropped off, not a new lead, so those two drafts were reframed to a reconnection after going quiet. Confirm this matches intent before publishing.

Merge fields. No merge-field issues found. All eight fields above are the empirically verified bang form and were preserved exactly; none were renamed or removed. Two operational links were preserved in place: ${!users.website} on the demo-booking and demo-confirmation templates, ${!Contacts.Account_Name.Contract_URL} on the commercial-agreement templates, and ${!Contacts.Account_Name.Contract_Renewal_URL} on the renewal templates. demo-hosted steps 3 to 5 have no booking link in the live templates; the drafts kept them reply-based to match, though adding ${!users.website} there would be reasonable and is flagged as an option.

No unsubscribe or preference-management text, and no compliance or legal wording, is present in the current templates, so there was none to preserve. Marketing consent is handled by the Marketing Consent stage copy asking for opt-in and by the send-time consent gate, not by an unsubscribe block. If a formal unsubscribe or preference footer is required for these automated sends, it is missing today and should be added before publication (flag, not fixed here).

Unused, duplicate, or unreachable (flagged, not touched). These are branches or kinds in the automation that intentionally send no email, so they have no template and no file: commercial:followup_due (re-engages via a Call only), stage-advance and call:positive or task:positive branches (the next stage's step 1 initial is the email), all deferred, negative, do-not-contact, manual-only and bad-data branches, and the dead kind onboarding_kickoff (no branch emits it). The legacy pre-cutover template set in .agents/context/zoho-backups (folders prefixed "Jurnii - ...") is not referenced by v6 and is out of scope.

Brand-guide ambiguities avoided, not used. The brand guide has a two-product versus three-product discrepancy (Jurnii UX and 360 versus adding Cortex) with differing proof-point figures, and uses both jurnii.io and jurnii.ai. The drafts stay at the category level and cite no product-specific numbers, so neither ambiguity affects the copy. Both are flagged for awareness.

Publication reminder. Publishing these would mean updating the live Zoho templates by id (via the email template update API) or by hand. That is a separate, deliberate step and has not been done. Confirm the two open questions above first.
