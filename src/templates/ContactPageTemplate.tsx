import React, { useState, useEffect } from 'react';

interface ContactFormState {
  first: string;
  last: string;
  email: string;
  company: string;
  role: string;
  interest: string;
  notes: string;
}

const INITIAL_FORM: ContactFormState = {
  first: '',
  last: '',
  email: '',
  company: '',
  role: '',
  interest: '',
  notes: '',
};

export const ContactPageTemplate: React.FC = () => {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).lucide) {
        (window as any).lucide.createIcons();
      }
      if (typeof (window as any).__fxSweep === 'function') {
        (window as any).__fxSweep();
      }
    }
  }, [sent, submitting]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Emit vendor-neutral analytics event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('jurnii:cta', {
            detail: {
              event: 'contact_form_submit',
              cta_id: 'contact-page-form',
              cta_label: 'Request a demo',
              cta_location: 'contact-page',
              cta_href: '/contact-us',
              intercepted: true,
              role: form.role,
              interest: form.interest,
              company: form.company,
            },
          })
        );
      } catch (_) {
        // Analytics must never fail submission
      }
    }

    // Gracefully attempt to record start journey if backend endpoint is accessible
    try {
      await fetch('/api/v1/submissions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.first.trim(),
          lastName: form.last.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          formPlacement: 'contact-page',
          ctaId: 'contact-page-form',
        }),
      });
    } catch (_) {
      // Background logging error is non-blocking
    }

    setSubmitting(false);
    setSent(true);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="page-hero-kicker">CONTACT</p>
          <p className="eyebrow">
            <span className="dot" />
            Talk to us
          </p>
          <h1 className="h1-page">Book a 30-minute demo.</h1>
          <p className="page-hero-lede">
            We'll show you live data from your actual competitor set. No slides, no script — just the product.
          </p>
        </div>
      </section>

      <section className="section reveal">
        <div className="container">
          <div className="contact-grid">
            {/* Left Column: Form / Confirmation */}
            <div>
              {sent ? (
                <div className="contact-form" style={{ padding: 'var(--spacing-8)' }}>
                  <div className="form-status is-success" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <i data-lucide="check-circle" style={{ width: 18, height: 18 }} />
                    <span>Demo request received</span>
                  </div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: '-0.012em',
                      margin: 0,
                      color: 'var(--foreground)',
                    }}
                  >
                    Thanks — we'll be in touch within a working day.
                  </h3>
                  <p
                    style={{
                      color: 'var(--muted-foreground)',
                      margin: 0,
                      lineHeight: 1.6,
                      fontSize: 'var(--text-base)',
                    }}
                  >
                    You'll get a calendar link from{' '}
                    <b style={{ color: 'var(--foreground)' }}>fraser@jurnii.io</b>. If you don't see it, check your junk
                    folder or email us directly.
                  </p>
                  <div
                    style={{
                      marginTop: 'var(--spacing-6)',
                      paddingTop: 'var(--spacing-6)',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      gap: 'var(--spacing-3)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => {
                        setForm(INITIAL_FORM);
                        setSent(false);
                      }}
                    >
                      Send another inquiry
                    </button>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => {
                        if (typeof (window as any).openDemoModal === 'function') {
                          (window as any).openDemoModal('contact-confirmation');
                        }
                      }}
                    >
                      Book slot on calendar now{' '}
                      <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
                    </button>
                  </div>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-row">
                      <label htmlFor="contact-first">First name</label>
                      <input
                        id="contact-first"
                        required
                        name="first"
                        placeholder="Fraser"
                        value={form.first}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="contact-last">Last name</label>
                      <input
                        id="contact-last"
                        required
                        name="last"
                        placeholder="Davidson"
                        value={form.last}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label htmlFor="contact-email">Work email</label>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      name="email"
                      placeholder="you@operator.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="contact-company">Company</label>
                    <input
                      id="contact-company"
                      required
                      name="company"
                      placeholder="Operator name"
                      value={form.company}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="contact-role">Role</label>
                    <select
                      id="contact-role"
                      required
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className={!form.role ? 'is-placeholder' : ''}
                    >
                      <option value="" disabled>
                        Select a role…
                      </option>
                      <option value="CEO / MD">CEO / MD</option>
                      <option value="CMO / Group Marketing">CMO / Group Marketing</option>
                      <option value="Head of CRM / Promotions">Head of CRM / Promotions</option>
                      <option value="Head of Product">Head of Product</option>
                      <option value="Head of Trading">Head of Trading</option>
                      <option value="Data / Analytics lead">Data / Analytics lead</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="contact-interest">What are you looking at?</label>
                    <select
                      id="contact-interest"
                      required
                      name="interest"
                      value={form.interest}
                      onChange={handleChange}
                      className={!form.interest ? 'is-placeholder' : ''}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      <option value="Jurnii 360 — competitor intelligence">Jurnii 360 — competitor intelligence</option>
                      <option value="Jurnii UX — UX benchmarking">Jurnii UX — UX benchmarking</option>
                      <option value="Jurnii MMM — media mix modelling">Jurnii MMM — media mix modelling</option>
                      <option value="The full 360 product suite">The full 360 product suite</option>
                      <option value="Partnership / B2B">Partnership / B2B</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label htmlFor="contact-notes">Anything we should know?</label>
                    <textarea
                      id="contact-notes"
                      name="notes"
                      rows={4}
                      placeholder="Markets, competitor set, timing — whatever helps us prepare."
                      value={form.notes}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn primary lg"
                    style={{ justifyContent: 'center', marginTop: 6, width: '100%' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Request a demo'}{' '}
                    <i data-lucide="arrow-right" style={{ width: 14, height: 14 }} className="arrow" />
                  </button>

                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                    By submitting, you agree to be contacted about Jurnii. We don't share your details. Read our{' '}
                    <a href="/privacy" style={{ textDecoration: 'underline' }}>
                      privacy notice
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>

            {/* Right Column: Aside Information */}
            <aside className="contact-aside">
              <div>
                <h3>What to expect</h3>
                <ul>
                  <li>30 minutes, video call.</li>
                  <li>Live walkthrough of Jurnii 360 against your competitor set.</li>
                  <li>If we're not the right fit, we'll tell you in the call.</li>
                </ul>

                <h3>Direct contact</h3>
                <p>
                  <b>Demos &amp; sales</b>
                  <br />
                  <a href="mailto:fraser@jurnii.io" style={{ textDecoration: 'none', color: 'inherit' }}>
                    fraser@jurnii.io
                  </a>
                </p>
                <p>
                  <b>Partnerships</b>
                  <br />
                  <a href="mailto:partnerships@jurnii.io" style={{ textDecoration: 'none', color: 'inherit' }}>
                    partnerships@jurnii.io
                  </a>
                </p>
                <p>
                  <b>Press &amp; reports</b>
                  <br />
                  <a href="mailto:press@jurnii.io" style={{ textDecoration: 'none', color: 'inherit' }}>
                    press@jurnii.io
                  </a>
                </p>

                <h3>Office</h3>
                <p>
                  Jurnii Ltd
                  <br />
                  London, United Kingdom
                </p>
              </div>

              {/* Instant Booking Action Card */}
              <div
                className="contact-instant-booking-card"
                style={{
                  marginTop: 'var(--spacing-6)',
                  padding: 'var(--spacing-6)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--jurnii-700)',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--jurnii-500)',
                      boxShadow: '0 0 0 3px rgba(var(--brand-glow),0.2)',
                    }}
                  />
                  Instant Scheduling
                </div>
                <h4
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    margin: '0 0 var(--spacing-2)',
                    color: 'var(--foreground)',
                  }}
                >
                  Prefer to pick a time right now?
                </h4>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--muted-foreground)',
                    margin: '0 0 var(--spacing-4)',
                    lineHeight: 1.5,
                  }}
                >
                  Reserve a live 30-minute walkthrough slot directly on Fraser's calendar.
                </p>
                <button
                  type="button"
                  className="btn accent"
                  onClick={() => {
                    if (typeof (window as any).openDemoModal === 'function') {
                      (window as any).openDemoModal('contact-instant-booking');
                    }
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Open Booking Wizard{' '}
                  <i data-lucide="calendar" style={{ width: 14, height: 14 }} className="arrow" />
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};
