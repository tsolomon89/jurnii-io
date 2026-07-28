/* =============================================================================
 * Jurnii — Book a Demo lead-capture wizard
 * -----------------------------------------------------------------------------
 * Framework-agnostic (vanilla JS). Powers two surfaces:
 *   1. Site-wide demo modal -> site.jsx calls JurniiBooking.render(...)
 *   2. Contact page         -> mounts into #jurnii-booking-aside
 *
 * Flow: 3 steps.
 *   Step 1  About you        (first/last name, work email, company)
 *   Step 2  Your interest    (role, product, source, goals, consent)
 *           --> lead is pushed to Zoho CRM here, BEFORE the calendar,
 *               so we capture the lead even if they never pick a time.
 *   Step 3  Pick a time      (Google Calendar availability iframe)
 *
 * =============================================================================
 *  DEVELOPER INTEGRATION — Zoho CRM
 * =============================================================================
 *  Leads are POSTed to YOUR OWN backend endpoint, which then creates the
 *  Lead/Contact in Zoho CRM server-side. NEVER put Zoho OAuth tokens or the
 *  Web-to-Lead auth in the browser — they belong on the server.
 *
 *  1. Set ZOHO_LEAD_ENDPOINT below (or window.JURNII_ZOHO_ENDPOINT before load).
 *  2. On that endpoint, exchange the JSON payload for a Zoho CRM record via the
 *     Zoho CRM API v2/v7 (POST /crm/v3/Leads) using a server-held OAuth token.
 *  3. Map payload fields -> Zoho field API names (see ZOHO_FIELD_MAP note below).
 * ============================================================================= */
(function () {
  "use strict";

  /* ---- CONFIG (developers: edit these) ------------------------------------ */

  // Your backend endpoint that talks to Zoho server-side. Leave '' to run the
  // UI in "stub" mode (form works, nothing is sent — logged to console).
  var ZOHO_LEAD_ENDPOINT = window.JURNII_ZOHO_ENDPOINT || ""; // e.g. "/api/zoho/lead"

  // Google Calendar appointment-schedule embed used on the final step.
  var CALENDAR_EMBED_URL =
    window.JURNII_CALENDAR_URL ||
    "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1_NxCZtQ4NvSzvAA1Pv44l5RhlRGgzMHFoQAmgxrKzvY54x-xPpyaFPiwMaVyctec8bRZWvWgH?gv=true";

  /* --------------------------------------------------------------------------
   *  ZOHO_FIELD_MAP — reference for the backend dev.
   *  The browser sends these keys; map them to Zoho CRM Lead field API names
   *  on the server, e.g.:
   *    firstName    -> First_Name
   *    lastName     -> Last_Name
   *    email        -> Email
   *    company      -> Company
   *    jobTitle     -> Designation
   *    product      -> Product_Interest   (custom field)
   *    source       -> Lead_Source
   *    message      -> Description
   *    marketing    -> Email_Opt_Out (inverse) / a custom consent field
   *    Lead_Source  -> "Website — Book a Demo"
   * ------------------------------------------------------------------------ */

  var PRODUCTS = [
    { value: "", label: "Select a product…", disabled: true },
    { value: "Jurnii UX", label: "Jurnii UX — UX Intelligence" },
    { value: "Jurnii 360", label: "Jurnii 360 — Commercial Radar" },
    { value: "Cortex", label: "Cortex — Marketing Attribution" },
    { value: "The full suite", label: "The full suite" },
    { value: "Not sure yet", label: "Not sure yet — help me choose" }
  ];

  var SOURCES = [
    { value: "", label: "Select…", disabled: true },
    { value: "Search", label: "Search engine" },
    { value: "LinkedIn", label: "LinkedIn" },
    { value: "Referral", label: "Referral / word of mouth" },
    { value: "Event", label: "Event or conference" },
    { value: "Press", label: "Press / article" },
    { value: "Other", label: "Other" }
  ];

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Common free/personal domains — we ask for a work email.
  var FREE_DOMAINS = ["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","aol.com","proton.me","protonmail.com","live.com","msn.com"];

  /* ---- Zoho submission hook ------------------------------------------------ */
  async function submitLeadToZoho(lead) {
    var payload = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      jobTitle: lead.jobTitle,
      product: lead.product,
      source: lead.source,
      message: lead.message,
      marketingConsent: lead.marketing,
      leadSource: "Website — Book a Demo",
      submittedAt: new Date().toISOString(),
      pageUrl: location.href
    };

    // No endpoint wired yet -> stub so the UX still flows in staging/preview.
    if (!ZOHO_LEAD_ENDPOINT) {
      console.warn("[Jurnii Booking] ZOHO_LEAD_ENDPOINT not set — lead NOT sent. Payload:", payload);
      await new Promise(function (r) { setTimeout(r, 550); }); // simulate latency
      return { ok: true, stubbed: true };
    }

    var res = await fetch(ZOHO_LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Lead submission failed (" + res.status + ")");
    return res.json().catch(function () { return { ok: true }; });
  }

  /* ---- small DOM helpers --------------------------------------------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function icons() { if (window.lucide) window.lucide.createIcons(); }

  /* ---- the wizard ---------------------------------------------------------- */
  function render(container, opts) {
    opts = opts || {};
    if (!container) return;
    container.innerHTML = "";

    var state = {
      step: 1,
      values: { firstName: "", lastName: "", email: "", company: "", jobTitle: "", product: "", source: "", message: "", marketing: false },
      errors: {},
      touched: {},
      submitting: false
    };

    var STEPS = [
      { n: 1, label: "About you" },
      { n: 2, label: "Your interest" },
      { n: 3, label: "Pick a time" }
    ];

    /* ---- validation per step ---- */
    function validate(step) {
      var v = state.values, e = {};
      if (step >= 1) {
        if (!v.firstName.trim()) e.firstName = "First name is required.";
        if (!v.lastName.trim()) e.lastName = "Last name is required.";
        if (!v.email.trim()) e.email = "Work email is required.";
        else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
        else if (FREE_DOMAINS.indexOf(v.email.trim().split("@")[1].toLowerCase()) !== -1) e.email = "Please use your work email.";
        if (!v.company.trim()) e.company = "Company is required.";
      }
      if (step >= 2) {
        if (!v.jobTitle.trim()) e.jobTitle = "Your role helps us tailor the demo.";
        if (!v.product) e.product = "Please choose what you're interested in.";
        if (!v.marketing) e.marketing = "Please tick the box to continue.";
      }
      return e;
    }

    /* ---- root scaffold ---- */
    var stepper = el("div", { class: "booking-steps" });
    var body = el("div", { class: "booking-body" });
    var root = el("div", { class: "booking" }, [stepper, body]);
    container.appendChild(root);

    function paintStepper() {
      stepper.innerHTML = "";
      STEPS.forEach(function (s, i) {
        var status = state.step > s.n ? "done" : state.step === s.n ? "active" : "todo";
        stepper.appendChild(el("div", { class: "booking-step is-" + status }, [
          el("span", { class: "booking-step-dot" }, [status === "done" ? "✓" : String(s.n)]),
          el("span", { class: "booking-step-label" }, [s.label])
        ]));
        if (i < STEPS.length - 1) stepper.appendChild(el("span", { class: "booking-step-bar is-" + status }));
      });
    }

    /* ---- field builders ---- */
    var fieldRefs = {}; // name -> { row, input, errNode }
    function field(name, label, o) {
      o = o || {};
      var invalid = state.errors[name] && state.touched[name];
      var input;
      var common = {
        id: "bk-" + name, name: name, class: invalid ? "invalid" : "",
        placeholder: o.placeholder || "",
        oninput: function (ev) { onChange(name, ev.target.value); },
        onblur: function () { onBlur(name); }
      };
      if (o.type === "textarea") {
        input = el("textarea", Object.assign({ rows: o.rows || 4 }, common));
        input.value = state.values[name];
      } else if (o.type === "select") {
        input = el("select", { id: common.id, name: name, class: (invalid ? "invalid" : "") + (state.values[name] ? "" : " is-placeholder"),
          onchange: function (ev) { onChange(name, ev.target.value); onBlur(name); } });
        o.options.forEach(function (op) {
          var oel = el("option", { value: op.value, disabled: op.disabled ? "disabled" : null }, [op.label]);
          if (state.values[name] === op.value) oel.selected = true;
          input.appendChild(oel);
        });
      } else {
        input = el("input", Object.assign({ type: o.type || "text" }, common));
        input.value = state.values[name];
      }
      var errNode = el("p", { class: "form-error", "aria-live": "polite" }, [invalid ? state.errors[name] : ""]);
      var row = el("div", { class: "form-row" }, [
        el("label", { for: common.id }, [label]),
        input,
        errNode
      ]);
      fieldRefs[name] = { row: row, input: input, errNode: errNode, isSelect: o.type === "select" };
      return row;
    }

    // Update a single field's error UI in place — no full repaint (keeps focus).
    function refreshFieldError(name) {
      var ref = fieldRefs[name];
      if (!ref) return;
      var msg = state.touched[name] ? state.errors[name] : null;
      if (msg) {
        ref.input.classList.add("invalid");
        ref.errNode.textContent = msg;
      } else {
        ref.input.classList.remove("invalid");
        ref.errNode.textContent = "";
      }
    }

    function onChange(name, val) {
      state.values[name] = val;
      if (state.touched[name]) { state.errors = validate(state.step); refreshFieldError(name); }
    }
    function onBlur(name) {
      state.touched[name] = true;
      state.errors = validate(state.step);
      refreshFieldError(name);
    }
    function repaintErrors() { paintBody(); }

    /* ---- step bodies ---- */
    function stepAboutYou() {
      return el("div", { class: "booking-panel" }, [
        el("p", { class: "booking-lede" }, ["Tell us who you are and we'll tailor the walkthrough to your operation."]),
        el("div", { class: "row-2" }, [
          field("firstName", "First name", { placeholder: "Fraser" }),
          field("lastName", "Last name", { placeholder: "Davidson" })
        ]),
        field("email", "Work email", { type: "email", placeholder: "you@operator.com" }),
        field("company", "Company", { placeholder: "Operator name" })
      ]);
    }

    function stepInterest() {
      var consentInvalid = state.errors.marketing && state.touched.marketing;
      return el("div", { class: "booking-panel" }, [
        el("p", { class: "booking-lede" }, ["What should we focus on? This routes you to the right specialist."]),
        el("div", { class: "row-2" }, [
          field("jobTitle", "Job title / role", { placeholder: "Head of CRM" }),
          field("product", "Interested in", { type: "select", options: PRODUCTS })
        ]),
        field("source", "How did you hear about us?", { type: "select", options: SOURCES }),
        field("message", "What are you hoping to solve?", { type: "textarea", rows: 4, placeholder: "Your markets, current stack, and what a good demo would show you." }),
        el("label", { class: "booking-consent" + (consentInvalid ? " invalid" : "") }, [
          (function () {
            var cb = el("input", { type: "checkbox", onchange: function (ev) { onChange("marketing", ev.target.checked); onBlur("marketing"); } });
            cb.checked = !!state.values.marketing;
            return cb;
          })(),
          el("span", { html: "I agree to be contacted about Jurnii and accept the <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">privacy policy</a>." })
        ]),
        el("p", { class: "form-error" }, [consentInvalid ? state.errors.marketing : ""])
      ]);
    }

    function stepCalendar() {
      var v = state.values;
      return el("div", { class: "booking-panel" }, [
        el("div", { class: "form-status is-success", role: "status" }, [
          el("i", { "data-lucide": "check-circle", style: "width:18px;height:18px" }),
          el("span", { html: "Thanks, <b>" + escapeHtml(v.firstName || "there") + "</b> — your details are in. Pick a time below and you'll get a calendar invite." })
        ]),
        el("div", { class: "booking-cal" }, [
          el("iframe", { src: CALENDAR_EMBED_URL, title: "Book a time with Jurnii", frameborder: "0", allow: "same-origin", style: "border:0" }),
          el("div", { class: "booking-cal-fallback" }, [
            "Trouble loading the calendar? Email ",
            el("a", { href: "mailto:hello@jurnii.io" }, ["hello@jurnii.io"]),
            " and we'll find a slot."
          ])
        ])
      ]);
    }

    /* ---- footer nav ---- */
    function footer() {
      var f = el("div", { class: "booking-foot" });
      if (state.step > 1 && state.step < 3) {
        f.appendChild(el("button", { type: "button", class: "btn ghost", onclick: back }, [
          el("i", { "data-lucide": "arrow-left", style: "width:14px;height:14px" }), " Back"
        ]));
      } else {
        f.appendChild(el("span", {})); // spacer keeps primary right-aligned
      }
      if (state.step === 1) {
        f.appendChild(el("button", { type: "button", class: "btn primary", onclick: next }, [
          "Continue ", el("i", { "data-lucide": "arrow-right", class: "arrow", style: "width:14px;height:14px" })
        ]));
      } else if (state.step === 2) {
        var label = state.submitting ? "Submitting…" : "Continue to booking";
        var btn = el("button", { type: "button", class: "btn primary", onclick: next, disabled: state.submitting ? "disabled" : null }, [
          label,
          state.submitting ? null : el("i", { "data-lucide": "arrow-right", class: "arrow", style: "width:14px;height:14px" })
        ]);
        f.appendChild(btn);
      } else {
        f.appendChild(el("button", { type: "button", class: "btn ghost", onclick: function () { if (opts.onClose) opts.onClose(); } }, ["Done"]));
      }
      return f;
    }

    /* ---- status banner (submit errors) ---- */
    var errorBanner = null;
    function setErrorBanner(msg) { errorBanner = msg; }

    /* ---- navigation ---- */
    function next() {
      state.errors = validate(state.step);
      // mark current step's fields touched
      Object.keys(state.errors).forEach(function (k) { state.touched[k] = true; });
      if (state.step === 1) {
        markTouched(["firstName", "lastName", "email", "company"]);
        state.errors = validate(1);
      } else if (state.step === 2) {
        markTouched(["jobTitle", "product", "marketing"]);
        state.errors = validate(2);
      }
      if (Object.keys(state.errors).length > 0) { paintBody(); return; }

      if (state.step === 1) { state.step = 2; setErrorBanner(null); paintAll(); return; }

      if (state.step === 2) {
        // submit to Zoho, THEN advance to calendar
        state.submitting = true; setErrorBanner(null); paintAll();
        submitLeadToZoho(state.values).then(function () {
          state.submitting = false; state.step = 3; paintAll();
        }).catch(function (err) {
          state.submitting = false;
          setErrorBanner("Something went wrong sending your details. Please try again, or email hello@jurnii.io.");
          console.error("[Jurnii Booking]", err);
          paintAll();
        });
      }
    }
    function back() { if (state.step > 1) { state.step -= 1; setErrorBanner(null); paintAll(); } }
    function markTouched(names) { names.forEach(function (n) { state.touched[n] = true; }); }

    /* ---- paint ---- */
    function paintBody() {
      body.innerHTML = "";
      if (state.step === 1) body.appendChild(stepAboutYou());
      else if (state.step === 2) body.appendChild(stepInterest());
      else body.appendChild(stepCalendar());
      if (errorBanner && state.step === 2) {
        body.appendChild(el("div", { class: "form-status is-error", role: "alert" }, [
          el("i", { "data-lucide": "alert-circle", style: "width:18px;height:18px" }),
          el("span", {}, [errorBanner])
        ]));
      }
      body.appendChild(footer());
      icons();
    }
    function paintAll() { paintStepper(); paintBody(); }

    paintAll();
    return { getState: function () { return state; } };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---- public API + auto-mount -------------------------------------------- */
  window.JurniiBooking = { render: render, submitLeadToZoho: submitLeadToZoho };

  function autoMount() {
    var inline = document.getElementById("jurnii-booking-form-inline");
    if (inline && !inline.getAttribute("data-mounted")) {
      inline.setAttribute("data-mounted", "1");
      render(inline, {});
    }
    var aside = document.getElementById("jurnii-booking-aside");
    if (aside && !aside.getAttribute("data-mounted")) {
      aside.setAttribute("data-mounted", "1");
      render(aside, {});
    }
    icons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount);
  else autoMount();
})();
