/* =========================================================================
   Jurnii Booking Form — Main JavaScript
   Features: Progressive steps, Custom calendar scheduler, Inferred country,
             UTM parameters capture, Real-time JSON debug panel.
   ========================================================================= */

(function () {
  // --- Country Code Mapping (must mirror the #jurnii-phone-code <select> options) ---
  const countryMapping = {
    '+44': 'United Kingdom',
    '+1': 'United States',
    '+356': 'Malta',
    '+350': 'Gibraltar',
    '+46': 'Sweden',
    '+49': 'Germany',
    '+34': 'Spain',
    '+353': 'Ireland',
    '+61': 'Australia',
    '+599': 'Curaçao',
    '+506': 'Costa Rica'
  };

  // --- Work-email-only gate (client UX; server is authoritative) ---
  const CLIENT_FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'hotmail.co.uk',
    'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me', 'gmx.com', 'mail.com', 'yandex.com', 'ymail.com', 'zoho.com'
  ]);
  function isWorkEmail(email) {
    const at = (email || '').lastIndexOf('@');
    if (at < 0) return false;
    const domain = email.slice(at + 1).trim().toLowerCase();
    if (!domain || domain.indexOf('.') < 0) return false;
    return !CLIENT_FREE_EMAIL_DOMAINS.has(domain);
  }

  // --- Progressive continuation persistence (resume after refresh) ---
  const PROGRESS_KEY = 'jurnii_booking_progress';

  function saveProgress() {
    try {
      const snapshot = {
        step: currentStep,
        journey_id: state.journey_id || null,
        journey_email: state.journey_email || null,
        token: continuationToken || null,
        first_name: state.first_name,
        last_name: state.last_name,
        email: state.email,
        marketing_consent: state.marketing_consent,
        company: state.company,
        job_title: state.job_title,
        phone_country_code: state.phone_country_code,
        phone_number: state.phone_number,
        inferred_country: state.inferred_country,
        optional_product_interest: state.optional_product_interest,
        saved_at: Date.now()
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(snapshot));
    } catch (_) { /* storage unavailable — non-fatal */ }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      const snap = JSON.parse(raw);
      // Continuation tokens expire after 2h; drop anything older.
      if (!snap.saved_at || (Date.now() - snap.saved_at) > 2 * 60 * 60 * 1000) {
        clearProgress();
        return null;
      }
      return snap;
    } catch (_) {
      return null;
    }
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (_) { /* non-fatal */ }
  }

  // --- Client-generated journey id (deterministic idempotency) ---
  // The journeyId is minted + persisted BEFORE the first Page-1 request and reused
  // on every retry/concurrent submit, so the server always sees the same opaque
  // correlation key. A new/unrelated journey (different email) mints a fresh one;
  // it is cleared on booking completion.
  function genUUID() {
    try {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (_) { /* fall through */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const rnd = (window.crypto && crypto.getRandomValues)
        ? crypto.getRandomValues(new Uint8Array(1))[0] % 16
        : Math.floor(Math.random() * 16);
      const v = c === 'x' ? rnd : (rnd & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function ensureJourneyId(email) {
    // Unrelated journey (different email) → discard and start fresh.
    if (state.journey_id && state.journey_email && state.journey_email !== email) {
      state.journey_id = null;
    }
    if (!state.journey_id) {
      state.journey_id = genUUID();
      state.journey_email = email;
      saveProgress();
    }
    return state.journey_id;
  }

  // Restore a saved partial registration into a freshly-rendered form so a
  // refresh (or return visit within the token's 2h life) resumes in place.
  async function restoreProgress(container) {
    const snap = loadProgress();
    if (!snap || !snap.token || !snap.journey_id || !snap.step || snap.step < 2) return false;

    continuationToken = snap.token;
    Object.assign(state, {
      journey_id: snap.journey_id,
      journey_email: snap.journey_email || null,
      first_name: snap.first_name || '',
      last_name: snap.last_name || '',
      email: snap.email || '',
      marketing_consent: !!snap.marketing_consent,
      company: snap.company || '',
      job_title: snap.job_title || '',
      phone_country_code: snap.phone_country_code || '+44',
      phone_number: snap.phone_number || '',
      inferred_country: snap.inferred_country || 'United Kingdom',
      optional_product_interest: snap.optional_product_interest || ''
    });

    const setVal = (sel, val) => { const el = container.querySelector(sel); if (el && val != null) el.value = val; };
    const setChk = (sel, val) => { const el = container.querySelector(sel); if (el) el.checked = !!val; };
    setVal('#jurnii-first-name', state.first_name);
    setVal('#jurnii-last-name', state.last_name);
    setVal('#jurnii-email', state.email);
    setChk('#jurnii-consent', state.marketing_consent);
    setVal('#jurnii-company', state.company);
    setVal('#jurnii-job-title', state.job_title);
    setVal('#jurnii-phone-code', state.phone_country_code);
    setVal('#jurnii-phone', state.phone_number);
    setVal('#jurnii-interest', state.optional_product_interest);
    updateDebugPanel();

    if (snap.step >= 3 && currentFetchAvailability) {
      await currentFetchAvailability();
      renderCalendar();
      goToStep(3);
    } else {
      goToStep(2);
    }
    return true;
  }

  // --- Initial Registration Object State ---
  let state = {
    registration_id: null,
    journey_id: null,
    journey_email: null,
    submitted_at: null,
    updated_at: new Date().toISOString(),
    status: 'partial',
    first_name: '',
    last_name: '',
    email: '',
    marketing_consent: false,
    company: '',
    job_title: '',
    phone_country_code: '+44',
    phone_number: '',
    inferred_country: 'United Kingdom',
    optional_product_interest: '',
    source_page: window.location.pathname || '/',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    selected_demo_datetime: null
  };

  let currentStep = 1;
  let calendarDate = new Date();
  let selectedDateStr = null; // "YYYY-MM-DD"
  let selectedTimeStr = null; // "HH:MM"
  let continuationToken = null;
  let availableSlots = [];
  // Set by bindFormEvents so resume-after-refresh can reload the calendar.
  let currentFetchAvailability = null;

  // --- Helper: Parse UTM parameters ---
  function captureUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    state.utm_source = urlParams.get('utm_source') || '';
    state.utm_medium = urlParams.get('utm_medium') || '';
    state.utm_campaign = urlParams.get('utm_campaign') || '';
  }

  // --- Helper: Update State Log ---
  function updateDebugPanel() {
    const debugPre = document.getElementById('jurnii-debug-json');
    if (debugPre) {
      state.updated_at = new Date().toISOString();
      debugPre.textContent = JSON.stringify(state, null, 2);
    }
  }

  // --- Validation Helpers ---
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function validateStep(step) {
    let isValid = true;
    clearErrors();

    if (step === 1) {
      const fName = document.getElementById('jurnii-first-name');
      const lName = document.getElementById('jurnii-last-name');
      const email = document.getElementById('jurnii-email');

      if (!fName || !fName.value.trim()) {
        showError('jurnii-first-name');
        isValid = false;
      }
      if (!lName || !lName.value.trim()) {
        showError('jurnii-last-name');
        isValid = false;
      }
      if (!email || !email.value.trim() || !validateEmail(email.value.trim())) {
        showError('jurnii-email');
        isValid = false;
      }
    } else if (step === 2) {
      const company = document.getElementById('jurnii-company');
      const jobTitle = document.getElementById('jurnii-job-title');
      const phone = document.getElementById('jurnii-phone');

      if (!company || !company.value.trim()) {
        showError('jurnii-company');
        isValid = false;
      }
      if (!jobTitle || !jobTitle.value.trim()) {
        showError('jurnii-job-title');
        isValid = false;
      }
      if (!phone || !phone.value.trim()) {
        showError('jurnii-phone');
        isValid = false;
      }
    } else if (step === 3) {
      if (!state.selected_demo_datetime) {
        alert('Please select a date and time slot for your demo briefing.');
        isValid = false;
      }
    }

    return isValid;
  }

  function showError(fieldId) {
    const el = document.getElementById(fieldId);
    if (el) el.classList.add('error');
  }

  function clearErrors() {
    const errors = document.querySelectorAll('.jurnii-input.error');
    errors.forEach(el => el.classList.remove('error'));
  }

  // --- Step Navigation Logic ---
  function goToStep(step) {
    // Transition UI steps
    const stepEls = document.querySelectorAll('.jurnii-form-step');
    stepEls.forEach((el, index) => {
      if (index + 1 === step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update steps progress bar
    const indicatorEls = document.querySelectorAll('.jurnii-step-indicator');
    indicatorEls.forEach((el, index) => {
      const idx = index + 1;
      el.classList.remove('active', 'completed');
      if (idx === step) {
        el.classList.add('active');
      } else if (idx < step) {
        el.classList.add('completed');
      }
    });

    currentStep = step;
    
    // Auto-focus first input on screen if relevant
    if (step === 1) {
      const fName = document.getElementById('jurnii-first-name');
      if (fName) fName.focus();
    } else if (step === 2) {
      const company = document.getElementById('jurnii-company');
      if (company) company.focus();
    }
  }

  // --- Generate Booking Calendar Markup ---
  // --- Generate Booking Calendar Markup ---
  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // Months names array
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthTitle = document.getElementById('jurnii-month-title');
    if (monthTitle) {
      monthTitle.textContent = `${monthNames[month]} ${year}`;
    }

    const grid = document.getElementById('jurnii-calendar-days');
    if (!grid) return;
    grid.innerHTML = '';

    // Prev month disabled check
    const prevBtn = document.getElementById('jurnii-calendar-prev');
    const now = new Date();
    if (prevBtn) {
      prevBtn.disabled = (year === now.getFullYear() && month === now.getMonth());
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Fill blank cells from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'jurnii-calendar-day empty';
      grid.appendChild(cell);
    }

    // Render active days
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(year, month, day);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = day;

      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = cellDate.getDay();

      if (dateString < todayStr) {
        // Past days
        cell.className = 'jurnii-calendar-day past';
        cell.disabled = true;
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekends
        cell.className = 'jurnii-calendar-day weekend';
        cell.disabled = true;
      } else {
        // Check if this date has any available slots
        const hasSlots = availableSlots.some(slot => slot.start.startsWith(dateString));
        if (hasSlots) {
          cell.className = 'jurnii-calendar-day available';
          if (selectedDateStr === dateString) {
            cell.classList.add('selected');
          }

          cell.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.jurnii-calendar-day.selected').forEach(el => {
              el.classList.remove('selected');
            });
            cell.classList.add('selected');
            selectedDateStr = dateString;
            
            // Reset time slot selection
            selectedTimeStr = null;
            state.selected_demo_datetime = null;
            
            // Re-render time slots
            renderTimeSlots(dateString);
            updateDebugPanel();
          });
        } else {
          // No slots left for this day
          cell.className = 'jurnii-calendar-day past';
          cell.disabled = true;
        }
      }

      grid.appendChild(cell);
    }
  }

  // --- Render Time Slots for Selected Date ---
  function renderTimeSlots(dateStr) {
    const container = document.getElementById('jurnii-slots-list');
    if (!container) return;

    if (!dateStr) {
      container.innerHTML = '<div class="jurnii-slots-empty">Select a date to view available time slots.</div>';
      return;
    }

    const slotsForDate = availableSlots.filter(slot => slot.start.startsWith(dateStr));

    container.innerHTML = '';
    
    const title = document.createElement('h4');
    title.className = 'jurnii-slots-title';
    
    const dObj = new Date(dateStr);
    const dateFormatted = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    title.textContent = `Available slots for ${dateFormatted}:`;
    container.appendChild(title);

    if (slotsForDate.length === 0) {
      const noSlots = document.createElement('div');
      noSlots.className = 'jurnii-slots-empty';
      noSlots.textContent = 'No slots available for this day.';
      container.appendChild(noSlots);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'jurnii-slots-grid';

    slotsForDate.forEach(slot => {
      const dateObj = new Date(slot.start);
      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const tzName = dateObj.toLocaleDateString([], { timeZoneName: 'short' }).split(', ')[1] || 'Local';
      const slotLabel = `${timeFormatted} (${tzName})`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'jurnii-time-slot-btn';
      btn.textContent = slotLabel;

      if (state.selected_demo_datetime === slot.start) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.jurnii-time-slot-btn.selected').forEach(el => {
          el.classList.remove('selected');
        });
        btn.classList.add('selected');
        selectedTimeStr = timeFormatted;
        state.selected_demo_datetime = slot.start;
        updateDebugPanel();
      });

      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }

  // --- Build Form Component Markup ---
  function createFormMarkup(isModal) {
    let markup = `
      <div class="jurnii-booking-container">
        <div id="jurnii-form-error" style="display:none; color: #ff5252; background: rgba(255,82,82,0.1); padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; text-align: center; border: 1px solid rgba(255,82,82,0.2);"></div>
        ${isModal ? `<button class="jurnii-close-btn" id="jurnii-modal-close" aria-label="Close modal"><i data-lucide="x" style="width:18px;height:18px;"></i></button>` : ''}
        
        <!-- Progress Steps -->
        <div class="jurnii-progress-container">
          <div class="jurnii-progress-steps">
            <div class="jurnii-step-indicator active">
              <div class="jurnii-step-bar"></div>
              <span class="jurnii-step-label">Your details</span>
            </div>
            <div class="jurnii-step-indicator">
              <div class="jurnii-step-bar"></div>
              <span class="jurnii-step-label">Company</span>
            </div>
            <div class="jurnii-step-indicator">
              <div class="jurnii-step-bar"></div>
              <span class="jurnii-step-label">Book demo</span>
            </div>
          </div>
        </div>

        <!-- Step 1: Basic details -->
        <div class="jurnii-form-step active" id="jurnii-step-1">
          <div class="jurnii-form-header">
            <h3>Let's get started</h3>
            <p>Tell us a little bit about yourself so we can customize your platform access and intelligence briefs.</p>
          </div>
          <div class="jurnii-form-grid">
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-first-name">First name *</label>
              <input type="text" class="jurnii-input" id="jurnii-first-name" placeholder="Alex" required>
            </div>
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-last-name">Last name *</label>
              <input type="text" class="jurnii-input" id="jurnii-last-name" placeholder="Mercer" required>
            </div>
            <div class="jurnii-form-group full-width">
              <label class="jurnii-label" for="jurnii-email">Business email *</label>
              <input type="email" class="jurnii-input" id="jurnii-email" placeholder="alex@company.com" required>
            </div>
            <div class="jurnii-form-group full-width" style="margin-top: 10px;">
              <label class="jurnii-consent-checkbox">
                <div class="jurnii-checkbox-wrapper">
                  <input type="checkbox" id="jurnii-consent">
                  <span class="jurnii-checkbox-checkmark"></span>
                </div>
                <span class="jurnii-consent-text">I consent to receive Jurnii's regular market intelligence reports and marketing updates. You can unsubscribe at any time.</span>
              </label>
            </div>
          </div>
          <div class="jurnii-form-actions">
            <button type="button" class="btn accent lg" id="jurnii-next-1">Next: Company details &rarr;</button>
          </div>
        </div>

        <!-- Step 2: Company details -->
        <div class="jurnii-form-step" id="jurnii-step-2">
          <div class="jurnii-form-header">
            <h3>Tell us about your organization</h3>
            <p>We tailor Jurnii benchmarking to your specific competitive set and company profile.</p>
          </div>
          <div class="jurnii-form-grid">
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-company">Company / Organization *</label>
              <input type="text" class="jurnii-input" id="jurnii-company" placeholder="e.g. Flutter Entertainment" required>
            </div>
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-job-title">Job Title *</label>
              <input type="text" class="jurnii-input" id="jurnii-job-title" placeholder="e.g. Head of Product" required>
            </div>
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-phone-code">Country code *</label>
              <select class="jurnii-select" id="jurnii-phone-code">
                <option value="+44" selected>United Kingdom (+44)</option>
                <option value="+1">United States (+1)</option>
                <option value="+356">Malta (+356)</option>
                <option value="+350">Gibraltar (+350)</option>
                <option value="+46">Sweden (+46)</option>
                <option value="+49">Germany (+49)</option>
                <option value="+34">Spain (+34)</option>
                <option value="+353">Ireland (+353)</option>
                <option value="+61">Australia (+61)</option>
                <option value="+599">Curaçao (+599)</option>
                <option value="+506">Costa Rica (+506)</option>
              </select>
            </div>
            <div class="jurnii-form-group">
              <label class="jurnii-label" for="jurnii-phone">Phone number *</label>
              <input type="tel" class="jurnii-input" id="jurnii-phone" placeholder="e.g. 7123 456789" required>
            </div>
            <div class="jurnii-form-group full-width">
              <label class="jurnii-label" for="jurnii-interest">What are you interested in seeing? (Optional)</label>
              <select class="jurnii-select" id="jurnii-interest">
                <option value="" disabled selected>Select an option...</option>
                <option value="Jurnii UX">Jurnii UX — User Experience Benchmarking</option>
                <option value="Jurnii 360">Jurnii 360 — Competitor Surveillance Radar</option>
                <option value="Jurnii Cortex">Cortex / Growth — Attribution & Scenarios</option>
                <option value="Not sure yet">Not sure yet</option>
              </select>
            </div>
          </div>
          <div class="jurnii-form-actions split">
            <button type="button" class="btn ghost-on-dark sm" id="jurnii-back-2">&larr; Back</button>
            <button type="button" class="btn accent lg" id="jurnii-next-2">Next: Book Demo briefing &rarr;</button>
          </div>
        </div>

        <!-- Step 3: Demo booking -->
        <div class="jurnii-form-step" id="jurnii-step-3">
          <div class="jurnii-form-header">
            <h3>Schedule your Jurnii Demonstration</h3>
            <p>Select an available briefing slot in the calendar below. Briefings are conducted virtually in GMT/CET.</p>
          </div>
          
          <div class="jurnii-scheduler-container">
            <!-- Calendar grid -->
            <div class="jurnii-calendar-wrapper">
              <div class="jurnii-calendar-header">
                <span id="jurnii-month-title">July 2026</span>
                <div class="jurnii-calendar-nav">
                  <button type="button" class="jurnii-calendar-nav-btn" id="jurnii-calendar-prev" aria-label="Previous Month"><i data-lucide="chevron-left" style="width:14px;height:14px;"></i></button>
                  <button type="button" class="jurnii-calendar-nav-btn" id="jurnii-calendar-next" aria-label="Next Month"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></button>
                </div>
              </div>
              <div class="jurnii-calendar-weekdays">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              <div class="jurnii-calendar-grid" id="jurnii-calendar-days">
                <!-- Dynamic day buttons populated by JS -->
              </div>
            </div>

            <!-- Time Slots side panel -->
            <div class="jurnii-slots-wrapper" id="jurnii-slots-list">
              <div class="jurnii-slots-empty">Select a date to view available time slots.</div>
            </div>
          </div>

          <div class="jurnii-form-actions split">
            <button type="button" class="btn ghost-on-dark sm" id="jurnii-back-3">&larr; Back</button>
            <button type="button" class="btn accent lg" id="jurnii-confirm-booking">Confirm Demo briefing</button>
          </div>
        </div>

        <!-- Step 4: Final Confirmation Screen -->
        <div class="jurnii-form-step" id="jurnii-step-confirm">
          <div class="jurnii-confirm-state">
            <div class="jurnii-confirm-icon">
              <i data-lucide="check" style="width:32px;height:32px;stroke-width:3;"></i>
            </div>
            <h3>Demo Briefing Confirmed</h3>
            <p>Your product demonstration has been scheduled. Calendar invitation and Google Meet details have been sent to your email.</p>
            
            <div class="jurnii-confirm-meta">
              <div>
                <span class="label">Briefing Time:</span>
                <span class="val" id="jurnii-confirm-time">July 15, 2026 at 2:00 PM CET</span>
              </div>
              <div>
                <span class="label">Booking Reference:</span>
                <span class="val val-mono" id="jurnii-confirm-reg-id">REG_XXXXXXXXX</span>
              </div>
              <div id="jurnii-confirm-meet-container" style="margin-top: 10px;">
                <span class="label">Google Meet:</span>
                <span class="val" id="jurnii-confirm-meet">Generating link...</span>
              </div>
              <div>
                <span class="label">Status:</span>
                <span class="val" style="color: var(--jurnii-300);">Confirmed</span>
              </div>
            </div>

            <div id="jurnii-confirm-manage-container" style="margin: 4px 0 18px; text-align: center;">
              <a id="jurnii-confirm-manage" href="#" style="color: var(--jurnii-300); text-decoration: underline; font-size: 14px;">Reschedule or cancel this booking</a>
            </div>

            ${isModal ? `<button type="button" class="btn primary lg" id="jurnii-confirm-close">Finish & Close</button>` : `<a href="index.html" class="btn primary lg">Back to Home</a>`}
          </div>
        </div>
      </div>
    `;
    return markup;
  }

  // --- Bind Form Events & Synchronize Fields ---
  function bindFormEvents(container) {
    const fName = container.querySelector('#jurnii-first-name');
    const lName = container.querySelector('#jurnii-last-name');
    const email = container.querySelector('#jurnii-email');
    const consent = container.querySelector('#jurnii-consent');
    const company = container.querySelector('#jurnii-company');
    const jobTitle = container.querySelector('#jurnii-job-title');
    const phoneCode = container.querySelector('#jurnii-phone-code');
    const phone = container.querySelector('#jurnii-phone');
    const interest = container.querySelector('#jurnii-interest');

    // Helper to manage loading state on buttons
    function setLoadingState(btn, loading) {
      if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = 'Processing...';
      } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || btn.textContent;
      }
    }

    function showGlobalError(msg) {
      const errEl = container.querySelector('#jurnii-form-error');
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function clearGlobalError() {
      const errEl = container.querySelector('#jurnii-form-error');
      if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
        errEl.style.color = '';
        errEl.style.background = '';
        errEl.style.border = '';
      }
    }

    // Neutral (non-error) notice, e.g. "our team will follow up" for Manual Review.
    function showGlobalInfo(msg) {
      const errEl = container.querySelector('#jurnii-form-error');
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#0b6b3a';
        errEl.style.background = 'rgba(16,185,129,0.10)';
        errEl.style.border = '1px solid rgba(16,185,129,0.25)';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    async function fetchAvailability() {
      try {
        const res = await fetch('/api/v1/availability');
        const data = await res.json();
        availableSlots = data.slots || [];
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      }
    }
    currentFetchAvailability = fetchAvailability;

    // Attach real-time synchronization listeners to update state
    if (fName) fName.addEventListener('input', (e) => { state.first_name = e.target.value.trim(); updateDebugPanel(); });
    if (lName) lName.addEventListener('input', (e) => { state.last_name = e.target.value.trim(); updateDebugPanel(); });
    if (email) email.addEventListener('input', (e) => { state.email = e.target.value.trim(); updateDebugPanel(); });
    if (consent) consent.addEventListener('change', (e) => { state.marketing_consent = e.target.checked; updateDebugPanel(); });
    if (company) company.addEventListener('input', (e) => { state.company = e.target.value.trim(); updateDebugPanel(); });
    if (jobTitle) jobTitle.addEventListener('input', (e) => { state.job_title = e.target.value.trim(); updateDebugPanel(); });
    if (phone) phone.addEventListener('input', (e) => { state.phone_number = e.target.value.trim(); updateDebugPanel(); });
    
    if (phoneCode) phoneCode.addEventListener('change', (e) => {
      const code = e.target.value;
      state.phone_country_code = code;
      state.inferred_country = countryMapping[code] || 'Unknown';
      updateDebugPanel();
    });

    if (interest) interest.addEventListener('change', (e) => {
      state.optional_product_interest = e.target.value;
      updateDebugPanel();
    });

    // Step 1 Next Actions
    const next1 = container.querySelector('#jurnii-next-1');
    if (next1) {
      next1.addEventListener('click', async (e) => {
        e.preventDefault();
        if (validateStep(1)) {
          if (!isWorkEmail(state.email)) {
            showError('jurnii-email');
            showGlobalError('Please use your work email address to book a demo.');
            return;
          }
          clearGlobalError();
          setLoadingState(next1, true);
          try {
            // Mint + persist the journeyId BEFORE the request so retries reuse it.
            const journeyId = ensureJourneyId(state.email);
            const res = await fetch('/api/v1/submissions/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                journeyId,
                firstName: state.first_name,
                lastName: state.last_name,
                email: state.email,
                consent: state.marketing_consent,
                sourcePage: state.source_page,
                utmSource: state.utm_source,
                utmMedium: state.utm_medium,
                utmCampaign: state.utm_campaign
              })
            });
            const data = await res.json();
            if (res.status === 409 && data.code === 'MANUAL_REVIEW') {
              showGlobalInfo(data.error || "We already have a record for this email — our team will be in touch.");
              return;
            }
            if (!res.ok) throw new Error(data.error || 'Failed to initialize submission');

            continuationToken = data.token;
            state.journey_id = data.journeyId || journeyId;
            goToStep(2);
            saveProgress();
            updateDebugPanel();
          } catch (err) {
            showGlobalError(err.message);
          } finally {
            setLoadingState(next1, false);
          }
        }
      });
    }

    // Step 2 Actions
    const next2 = container.querySelector('#jurnii-next-2');
    if (next2) {
      next2.addEventListener('click', async (e) => {
        e.preventDefault();
        if (validateStep(2)) {
          clearGlobalError();
          setLoadingState(next2, true);
          // Availability is Zoho-independent — prefetch it concurrently with the
          // save. Pre-attach a catch so a rejected prefetch can never surface as an
          // unhandled rejection if the save fails first.
          const availabilityReady = fetchAvailability().catch(() => {});
          try {
            const res = await fetch(`/api/v1/submissions/${state.journey_id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${continuationToken}`
              },
              body: JSON.stringify({
                company: state.company,
                jobTitle: state.job_title,
                phone: state.phone_country_code + state.phone_number,
                country: state.inferred_country,
                productInterest: state.optional_product_interest
              })
            });
            const data = await res.json();
            // A failed save must NOT advance — the calendar never opens on unsaved data.
            if (!res.ok) throw new Error(data.error || 'Failed to save company details');

            continuationToken = data.token;

            // Save succeeded → reveal the calendar as soon as availability is ready.
            await availabilityReady;
            renderCalendar();
            goToStep(3);
            saveProgress();
            updateDebugPanel();
          } catch (err) {
            showGlobalError(err.message);
          } finally {
            setLoadingState(next2, false);
          }
        }
      });
    }

    const back2 = container.querySelector('#jurnii-back-2');
    if (back2) {
      back2.addEventListener('click', (e) => {
        e.preventDefault();
        goToStep(1);
      });
    }

    // Step 3 Actions
    const back3 = container.querySelector('#jurnii-back-3');
    if (back3) {
      back3.addEventListener('click', (e) => {
        e.preventDefault();
        goToStep(2);
      });
    }

    const confirmBtn = container.querySelector('#jurnii-confirm-booking');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (validateStep(3)) {
          clearGlobalError();
          setLoadingState(confirmBtn, true);
          try {
            const res = await fetch('/api/v1/bookings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${continuationToken}`
              },
              body: JSON.stringify({
                slotStart: state.selected_demo_datetime
              })
            });
            const data = await res.json();
            if (res.status === 409 && data.code === 'SLOT_TAKEN') {
              showGlobalError(data.error || 'That slot was just taken. Please pick another.');
              state.selected_demo_datetime = null;
              selectedTimeStr = null;
              await fetchAvailability();
              renderCalendar();
              renderTimeSlots(selectedDateStr);
              return;
            }
            if (!res.ok || data.status !== 'confirmed') {
              throw new Error(data.error || data.message || 'Failed to complete booking');
            }

            clearProgress();
            // Journey complete — drop the id so any later booking starts a fresh journey.
            state.journey_id = null;
            state.journey_email = null;
            state.submitted_at = new Date().toISOString();
            state.status = 'confirmed';
            state.registration_id = data.bookingId;
            updateDebugPanel();

            // Populate confirmation panel variables
            const confirmTime = container.querySelector('#jurnii-confirm-time');
            const confirmRegId = container.querySelector('#jurnii-confirm-reg-id');
            const confirmMeet = container.querySelector('#jurnii-confirm-meet');
            
            if (confirmTime && state.selected_demo_datetime) {
              const dateObj = new Date(state.selected_demo_datetime);
              confirmTime.textContent = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) + ' at ' + selectedTimeStr;
            }
            if (confirmRegId) {
              confirmRegId.textContent = state.registration_id;
            }
            if (confirmMeet && data.meetLink) {
              confirmMeet.innerHTML = `<a href="${data.meetLink}" target="_blank" style="color: var(--jurnii-300); text-decoration: underline; font-weight: 500;">Join Google Meet</a>`;
            } else if (confirmMeet) {
              confirmMeet.textContent = 'Invitation sent via email';
            }

            const confirmManage = container.querySelector('#jurnii-confirm-manage');
            if (confirmManage && data.manageUrl) {
              confirmManage.href = data.manageUrl;
            } else if (confirmManage) {
              confirmManage.parentElement.style.display = 'none';
            }

            goToStep(4);
          } catch (err) {
            showGlobalError(err.message);
          } finally {
            setLoadingState(confirmBtn, false);
          }
        }
      });
    }

    // Calendar Navigation
    const prevMonth = container.querySelector('#jurnii-calendar-prev');
    if (prevMonth) {
      prevMonth.addEventListener('click', (e) => {
        e.preventDefault();
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
      });
    }

    const nextMonth = container.querySelector('#jurnii-calendar-next');
    if (nextMonth) {
      nextMonth.addEventListener('click', (e) => {
        e.preventDefault();
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
      });
    }

    // Initialize Lucide icons if loaded
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- Initialize Modal Overlay Layout ---
  function initModalOverlay() {
    let overlay = document.querySelector('.jurnii-modal-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'jurnii-modal-overlay';
    overlay.innerHTML = `
      <div class="jurnii-modal-wrapper">
        <!-- Render form dynamically here -->
      </div>
    `;

    document.body.appendChild(overlay);

    // Modal close hook: click on the backdrop closes the modal.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    return overlay;
  }

  function openModal() {
    const overlay = initModalOverlay();
    const wrapper = overlay.querySelector('.jurnii-modal-wrapper');
    
    // Inject form markup
    wrapper.innerHTML = createFormMarkup(true);
    bindFormEvents(wrapper);

    // Reset step
    goToStep(1);

    // Display modal
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Bind local close buttons
    const closeBtn = wrapper.querySelector('#jurnii-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const finishBtn = wrapper.querySelector('#jurnii-confirm-close');
    if (finishBtn) finishBtn.addEventListener('click', closeModal);
    
    updateDebugPanel();
  }

  function closeModal() {
    const overlay = document.querySelector('.jurnii-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      
      // Delay cleaning form markup to allow transition animation to complete
      setTimeout(() => {
        const wrapper = overlay.querySelector('.jurnii-modal-wrapper');
        if (wrapper) wrapper.innerHTML = '';
      }, 300);
    }
  }

  // --- Self-service manage (cancel / reschedule) on manage.html ---
  async function fetchAvailabilityGlobal() {
    try {
      const res = await fetch('/api/v1/availability');
      const data = await res.json();
      availableSlots = data.slots || [];
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    }
  }

  function createManageMarkup() {
    return `
      <div class="jurnii-booking-container">
        <div id="jurnii-form-error" style="display:none; color:#ff5252; background:rgba(255,82,82,0.1); padding:12px; border-radius:6px; margin-bottom:16px; font-size:14px; text-align:center; border:1px solid rgba(255,82,82,0.2);"></div>

        <div class="jurnii-form-step active" id="jurnii-manage-home">
          <div class="jurnii-form-header">
            <h3>Manage your demo booking</h3>
            <p>Reschedule to a new time or cancel your Jurnii product demonstration.</p>
          </div>
          <div class="jurnii-form-actions split">
            <button type="button" class="btn ghost-on-dark sm" id="jurnii-manage-cancel">Cancel booking</button>
            <button type="button" class="btn accent lg" id="jurnii-manage-reschedule">Reschedule &rarr;</button>
          </div>
        </div>

        <div class="jurnii-form-step" id="jurnii-manage-reschedule-step">
          <div class="jurnii-form-header">
            <h3>Pick a new time</h3>
            <p>Select an available briefing slot below.</p>
          </div>
          <div class="jurnii-scheduler-container">
            <div class="jurnii-calendar-wrapper">
              <div class="jurnii-calendar-header">
                <span id="jurnii-month-title">—</span>
                <div class="jurnii-calendar-nav">
                  <button type="button" class="jurnii-calendar-nav-btn" id="jurnii-calendar-prev" aria-label="Previous Month"><i data-lucide="chevron-left" style="width:14px;height:14px;"></i></button>
                  <button type="button" class="jurnii-calendar-nav-btn" id="jurnii-calendar-next" aria-label="Next Month"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></button>
                </div>
              </div>
              <div class="jurnii-calendar-weekdays">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              <div class="jurnii-calendar-grid" id="jurnii-calendar-days"></div>
            </div>
            <div class="jurnii-slots-wrapper" id="jurnii-slots-list">
              <div class="jurnii-slots-empty">Select a date to view available time slots.</div>
            </div>
          </div>
          <div class="jurnii-form-actions split">
            <button type="button" class="btn ghost-on-dark sm" id="jurnii-manage-back">&larr; Back</button>
            <button type="button" class="btn accent lg" id="jurnii-manage-confirm">Confirm new time</button>
          </div>
        </div>

        <div class="jurnii-form-step" id="jurnii-manage-result">
          <div class="jurnii-confirm-state">
            <div class="jurnii-confirm-icon"><i data-lucide="check" style="width:32px;height:32px;stroke-width:3;"></i></div>
            <h3 id="jurnii-manage-result-title">Done</h3>
            <p id="jurnii-manage-result-msg"></p>
            <a href="index.html" class="btn primary lg">Back to Home</a>
          </div>
        </div>
      </div>
    `;
  }

  function showManageStep(container, id) {
    ['jurnii-manage-home', 'jurnii-manage-reschedule-step', 'jurnii-manage-result'].forEach(s => {
      const el = container.querySelector('#' + s);
      if (el) el.classList.toggle('active', s === id);
    });
  }

  function bindManageEvents(container, token, journeyId) {
    const errEl = container.querySelector('#jurnii-form-error');
    const showErr = (m) => { if (errEl) { errEl.textContent = m; errEl.style.display = 'block'; } };
    const clearErr = () => { if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; } };
    const setLoading = (btn, on) => {
      if (!btn) return;
      if (on) { btn.disabled = true; btn.dataset.orig = btn.textContent; btn.textContent = 'Processing...'; }
      else { btn.disabled = false; btn.textContent = btn.dataset.orig || btn.textContent; }
    };
    const result = (title, msg) => {
      const t = container.querySelector('#jurnii-manage-result-title');
      const m = container.querySelector('#jurnii-manage-result-msg');
      if (t) t.textContent = title;
      if (m) m.textContent = msg;
      showManageStep(container, 'jurnii-manage-result');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const reBtn = container.querySelector('#jurnii-manage-reschedule');
    if (reBtn) reBtn.addEventListener('click', async () => {
      clearErr();
      showManageStep(container, 'jurnii-manage-reschedule-step');
      await fetchAvailabilityGlobal();
      renderCalendar();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    const backBtn = container.querySelector('#jurnii-manage-back');
    if (backBtn) backBtn.addEventListener('click', () => { clearErr(); showManageStep(container, 'jurnii-manage-home'); });

    const confirmBtn = container.querySelector('#jurnii-manage-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
      clearErr();
      if (!state.selected_demo_datetime) { showErr('Please select a date and time slot.'); return; }
      setLoading(confirmBtn, true);
      try {
        const res = await fetch(`/api/v1/bookings/${encodeURIComponent(journeyId)}/reschedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ slotStart: state.selected_demo_datetime })
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.code === 'SLOT_TAKEN') {
          showErr('That slot was just taken. Please pick another.');
          state.selected_demo_datetime = null;
          await fetchAvailabilityGlobal();
          renderCalendar();
          renderTimeSlots(selectedDateStr);
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Could not reschedule the booking.');
        result('Booking rescheduled', 'Your demo has been moved. An updated calendar invitation has been sent to your email.');
      } catch (err) {
        showErr(err.message);
      } finally {
        setLoading(confirmBtn, false);
      }
    });

    const cancelBtn = container.querySelector('#jurnii-manage-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', async () => {
      clearErr();
      if (!window.confirm('Cancel your demo booking? This cannot be undone.')) return;
      setLoading(cancelBtn, true);
      try {
        const res = await fetch(`/api/v1/bookings/${encodeURIComponent(journeyId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not cancel the booking.');
        result('Booking cancelled', 'Your demo has been cancelled. You can book again any time.');
      } catch (err) {
        showErr(err.message);
      } finally {
        setLoading(cancelBtn, false);
      }
    });

    const prev = container.querySelector('#jurnii-calendar-prev');
    if (prev) prev.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
    const next = container.querySelector('#jurnii-calendar-next');
    if (next) next.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
  }

  function initManage(container) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const id = params.get('id');
    container.innerHTML = createManageMarkup();

    if (!token || !id) {
      const err = container.querySelector('#jurnii-form-error');
      if (err) { err.textContent = 'This management link is invalid or has expired. Please use the link from your booking confirmation email.'; err.style.display = 'block'; }
      const actions = container.querySelector('#jurnii-manage-home .jurnii-form-actions');
      if (actions) actions.remove();
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    bindManageEvents(container, token, id);
    showManageStep(container, 'jurnii-manage-home');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- Initialize JSON Debug Logging Console ---
  function initDebugPanel() {
    // Gate to development environments only
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) return;

    let debugToggle = document.getElementById('jurnii-debug-toggle');
    if (debugToggle) return;

    // Toggle button
    debugToggle = document.createElement('button');
    debugToggle.id = 'jurnii-debug-toggle';
    debugToggle.className = 'jurnii-debug-toggle';
    debugToggle.innerHTML = '<span class="badge"></span> Debug Logs';
    document.body.appendChild(debugToggle);

    // Floating logger panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'jurnii-debug-panel';
    debugPanel.className = 'jurnii-debug-panel';
    debugPanel.innerHTML = `
      <div class="jurnii-debug-header">
        <span class="title"><i data-lucide="terminal" style="width:14px;height:14px;color:var(--jurnii-200);"></i> JURNII REGISTRATION OBJECT</span>
        <button class="clear" id="jurnii-debug-clear">Reset</button>
      </div>
      <div class="jurnii-debug-content">
        <pre id="jurnii-debug-json"></pre>
      </div>
    `;
    document.body.appendChild(debugPanel);

    // Bind open/close toggle
    debugToggle.addEventListener('click', (e) => {
      e.preventDefault();
      debugPanel.classList.toggle('active');
    });

    // Reset simulator state
    const clearBtn = debugPanel.querySelector('#jurnii-debug-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Reset state object
        state = {
          registration_id: null,
          submitted_at: null,
          updated_at: new Date().toISOString(),
          status: 'partial',
          first_name: '',
          last_name: '',
          email: '',
          marketing_consent: false,
          company: '',
          job_title: '',
          phone_country_code: '+44',
          phone_number: '',
          inferred_country: 'United Kingdom',
          optional_product_interest: '',
          source_page: window.location.pathname || '/',
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          selected_demo_datetime: null
        };
        
        selectedDateStr = null;
        selectedTimeStr = null;
        currentStep = 1;

        // Re-capture UTMs
        captureUTMParameters();

        // Refresh UI
        const inlineContainer = document.getElementById('jurnii-booking-form-inline');
        if (inlineContainer) {
          inlineContainer.innerHTML = createFormMarkup(false);
          bindFormEvents(inlineContainer);
          goToStep(1);
        } else {
          // If modal is active, refresh wrappers
          const modalWrapper = document.querySelector('.jurnii-modal-wrapper');
          if (modalWrapper && modalWrapper.innerHTML !== '') {
            modalWrapper.innerHTML = createFormMarkup(true);
            bindFormEvents(modalWrapper);
            goToStep(1);
          }
        }

        updateDebugPanel();
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- Initial Setup on DOM Content Load ---
  document.addEventListener('DOMContentLoaded', () => {
    // Capture UTM and source path
    captureUTMParameters();
    initDebugPanel();
    updateDebugPanel();

    // Dedicated booking-management page (manage.html)?
    const manageContainer = document.getElementById('jurnii-manage-inline');
    if (manageContainer) {
      initManage(manageContainer);
      return;
    }

    // Check if the page is the dedicated booking landing page
    const inlineContainer = document.getElementById('jurnii-booking-form-inline');
    if (inlineContainer) {
      // Embed inline booking form directly
      inlineContainer.innerHTML = createFormMarkup(false);
      bindFormEvents(inlineContainer);
      goToStep(1);
      // Resume a partial registration if one was saved (refresh / return visit).
      restoreProgress(inlineContainer);
    }

    // Intercept `.open-booking-modal-btn` and booking triggers
    document.addEventListener('click', (e) => {
      // Traverse target parents to identify if it is a trigger
      let el = e.target;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains('open-booking-modal-btn')) {
          e.preventDefault();
          openModal();
          return;
        }
        
        // Intercept navigation Book a demo links or old buttons
        if (el.tagName === 'A' && el.getAttribute('href') === 'book.html') {
          // If JS is active, open modal instead of redirecting (progressive enhancement)
          // EXCEPT on the book.html page itself where it's embedded inline
          if (!inlineContainer) {
            e.preventDefault();
            openModal();
            return;
          }
        }
        
        el = el.parentElement;
      }
    });
  });
})();
