/**
 * Jurnii Competitor UX Benchmarking Dashboard Controller
 * Governs dynamic tab switching, desktop vs. mobile audits, operator performance views,
 * and high-fidelity micro-animations for glowing vector gauges and chart bars.
 */
(function () {
  "use strict";

  // Operator technical audits & speed data matrix
  const brandPerformanceData = {
    vv: { // VidaVegas
      name: "VidaVegas",
      desktop: {
        speed: 52,
        accessibility: 100,
        bestPractices: 85,
        seo: 90,
        audits: {
          fcp: { val: "3.28s", status: "warn" },
          tbt: { val: "1.11s", status: "warn" },
          tti: { val: "9.8s", status: "poor" },
          lcp: { val: "4.09s", status: "warn" },
          si: { val: "5.8s", status: "warn" },
          cls: { val: "0.057", status: "success" }
        }
      },
      mobile: {
        speed: 78,
        accessibility: 100,
        bestPractices: 100,
        seo: 90,
        audits: {
          fcp: { val: "1.8s", status: "success" },
          tbt: { val: "280ms", status: "success" },
          tti: { val: "3.9s", status: "warn" },
          lcp: { val: "2.1s", status: "success" },
          si: { val: "3.2s", status: "success" },
          cls: { val: "0.024", status: "success" }
        }
      }
    },
    mc: { // MiCasino
      name: "MiCasino",
      desktop: {
        speed: 41,
        accessibility: 80,
        bestPractices: 75,
        seo: 85,
        audits: {
          fcp: { val: "4.1s", status: "poor" },
          tbt: { val: "1.8s", status: "poor" },
          tti: { val: "12.5s", status: "poor" },
          lcp: { val: "5.6s", status: "poor" },
          si: { val: "7.2s", status: "poor" },
          cls: { val: "0.12", status: "warn" }
        }
      },
      mobile: {
        speed: 32,
        accessibility: 75,
        bestPractices: 70,
        seo: 80,
        audits: {
          fcp: { val: "5.8s", status: "poor" },
          tbt: { val: "3.2s", status: "poor" },
          tti: { val: "16.1s", status: "poor" },
          lcp: { val: "7.8s", status: "poor" },
          si: { val: "9.6s", status: "poor" },
          cls: { val: "0.18", status: "warn" }
        }
      }
    },
    cb: { // CoolBetChile
      name: "CoolBetChile",
      desktop: {
        speed: 4,
        accessibility: 82,
        bestPractices: 70,
        seo: 90,
        audits: {
          fcp: { val: "6.2s", status: "poor" },
          tbt: { val: "4.5s", status: "poor" },
          tti: { val: "18.2s", status: "poor" },
          lcp: { val: "9.1s", status: "poor" },
          si: { val: "11.4s", status: "poor" },
          cls: { val: "0.28", status: "poor" }
        }
      },
      mobile: {
        speed: 2,
        accessibility: 78,
        bestPractices: 68,
        seo: 90,
        audits: {
          fcp: { val: "8.4s", status: "poor" },
          tbt: { val: "6.8s", status: "poor" },
          tti: { val: "22.4s", status: "poor" },
          lcp: { val: "12.1s", status: "poor" },
          si: { val: "14.8s", status: "poor" },
          cls: { val: "0.35", status: "poor" }
        }
      }
    },
    bt: { // Betsson1001
      name: "Betsson1001",
      desktop: {
        speed: 43,
        accessibility: 85,
        bestPractices: 80,
        seo: 90,
        audits: {
          fcp: { val: "3.8s", status: "warn" },
          tbt: { val: "1.5s", status: "poor" },
          tti: { val: "11.2s", status: "poor" },
          lcp: { val: "4.8s", status: "warn" },
          si: { val: "6.5s", status: "warn" },
          cls: { val: "0.08", status: "success" }
        }
      },
      mobile: {
        speed: 35,
        accessibility: 80,
        bestPractices: 78,
        seo: 90,
        audits: {
          fcp: { val: "5.2s", status: "poor" },
          tbt: { val: "2.8s", status: "poor" },
          tti: { val: "14.5s", status: "poor" },
          lcp: { val: "6.8s", status: "poor" },
          si: { val: "8.2s", status: "poor" },
          cls: { val: "0.11", status: "warn" }
        }
      }
    }
  };

  // State Management variables
  let currentTab = "summary";
  let currentBrand = "vv";
  let currentDevice = "desktop";

  // Elements cash
  let tabButtons = [];
  let panels = [];
  let deviceButtons = [];
  let opSelectButtons = [];
  let progressBars = [];

  function initDashboard() {
    // Gather tabs controls
    tabButtons = document.querySelectorAll(".dashboard-tabs .tab-btn");
    panels = document.querySelectorAll(".dashboard-panel");
    deviceButtons = document.querySelectorAll(".device-toggle-pill .device-btn");
    opSelectButtons = document.querySelectorAll(".performance-operators-sidebar .op-select-btn");

    if (tabButtons.length === 0) return;

    // Harvest progress bars for interactive transition
    harvestProgressBars();

    // Bind Tab Switching Clicks
    tabButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        const tabName = this.getAttribute("data-tab");
        switchTab(tabName);
      });
    });

    // Bind Device Toggles Clicks
    deviceButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        const deviceName = this.getAttribute("data-device");
        switchDevice(deviceName);
      });
    });

    // Bind Operator Selection Clicks
    opSelectButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        const brandCode = this.getAttribute("data-brand");
        switchBrand(brandCode);
      });
    });

    // Setup Semicircular Gauges in Panel 1
    initSemicircularGauges();

    // Run initial state loading
    switchTab("summary");
  }

  /**
   * Harvest inline-styled widths for animations, storing them in custom attributes
   */
  function harvestProgressBars() {
    // Find category progress bars and heuristic bars
    const bars = document.querySelectorAll(".cat-fill, .h-bar-fill");
    bars.forEach(bar => {
      const origWidth = bar.style.width || "0%";
      bar.setAttribute("data-target-width", origWidth);
      bar.style.width = "0%";
      bar.style.transition = "width 800ms cubic-bezier(0.4, 0, 0.2, 1)";
      progressBars.push(bar);
    });
  }

  /**
   * Trigger animation for progress bars inside the active panel
   */
  function animateVisibleBars(panelElement) {
    const activeBars = panelElement.querySelectorAll(".cat-fill, .h-bar-fill");
    setTimeout(() => {
      activeBars.forEach(bar => {
        const target = bar.getAttribute("data-target-width");
        if (target) {
          bar.style.width = target;
        }
      });
    }, 50);
  }

  /**
   * Prepare semicircular gauges for fluid on-visible rendering
   */
  function initSemicircularGauges() {
    const gauges = document.querySelectorAll(".semicircle-gauge .gauge-fill");
    gauges.forEach(gauge => {
      const origOffset = gauge.getAttribute("stroke-dashoffset");
      gauge.setAttribute("data-target-offset", origOffset);
      // Reset to fully empty (125.66 is total circumference stroke array)
      gauge.style.strokeDashoffset = "125.66";
      gauge.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)";
    });
  }

  /**
   * Animate semicircular gauges inside Panel 1
   */
  function animateSemicircularGauges() {
    const gauges = document.querySelectorAll(".semicircle-gauge .gauge-fill");
    setTimeout(() => {
      gauges.forEach(gauge => {
        const target = gauge.getAttribute("data-target-offset");
        if (target) {
          gauge.style.strokeDashoffset = target;
        }
      });
    }, 80);
  }

  /**
   * Reset all progress bars in a panel back to zero
   */
  function resetBarsInPanel(panelElement) {
    const activeBars = panelElement.querySelectorAll(".cat-fill, .h-bar-fill");
    activeBars.forEach(bar => {
      bar.style.width = "0%";
    });
  }

  /**
   * Switch the Dashboard Tab View
   */
  function switchTab(tabName) {
    currentTab = tabName;

    // Update buttons state
    tabButtons.forEach(btn => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update panels visibility
    panels.forEach(panel => {
      const panelName = panel.getAttribute("data-panel");
      if (panelName === tabName) {
        panel.classList.add("active");
        
        // Trigger animations based on active panel
        if (tabName === "summary") {
          animateSemicircularGauges();
          animateVisibleBars(panel);
        } else if (tabName === "usability") {
          animateVisibleBars(panel);
        } else if (tabName === "performance") {
          updateLighthouseDetails();
        }
      } else {
        panel.classList.remove("active");
        if (panelName === "summary" || panelName === "usability") {
          resetBarsInPanel(panel);
        }
      }
    });

    // Fire Lucide to ensure icons within new views are bound correctly
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Toggle between Desktop & Mobile performance profiles
   */
  function switchDevice(deviceName) {
    currentDevice = deviceName;

    // Update button states
    deviceButtons.forEach(btn => {
      if (btn.getAttribute("data-device") === deviceName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Dynamically update the speed ratings showing on the operator select buttons
    opSelectButtons.forEach(btn => {
      const bCode = btn.getAttribute("data-brand");
      const speedVal = brandPerformanceData[bCode][deviceName].speed;
      const speedLabelNode = btn.querySelector(".op-speed-lbl");
      if (speedLabelNode) {
        // Pad single digits (e.g. 04, 02) to match premium UI
        speedLabelNode.innerText = speedVal < 10 ? `0${speedVal}` : speedVal;
      }
    });

    // Redraw and animate active Lighthouse details
    updateLighthouseDetails();
  }

  /**
   * Switch the active Operator brand within the Performance view
   */
  function switchBrand(brandCode) {
    currentBrand = brandCode;

    // Update list styling
    opSelectButtons.forEach(btn => {
      if (btn.getAttribute("data-brand") === brandCode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Redraw and animate active Lighthouse details
    updateLighthouseDetails();
  }

  /**
   * Return color class helper based on Lighthouse score boundaries
   */
  function getScoreColorClass(score) {
    if (score >= 76) return "color-success";
    if (score >= 46) return "color-warn";
    return "color-poor";
  }

  /**
   * Dynamically update the Lighthouse circular gauges and 6 technical metrics
   */
  function updateLighthouseDetails() {
    const data = brandPerformanceData[currentBrand][currentDevice];
    if (!data) return;

    // 1. Update Speed (Performance) Circle
    const speedRing = document.getElementById("lh-speed-ring");
    const speedVal = document.getElementById("lh-speed-val");
    if (speedRing && speedVal) {
      // Set circular stroke dashboard fill offset
      speedRing.setAttribute("stroke-dasharray", `${data.speed}, 100`);
      speedVal.innerText = data.speed;
      
      // Update color class
      const colorClass = getScoreColorClass(data.speed);
      speedRing.className.baseVal = `ring-fill ${colorClass}`;
    }

    // 2. Update Accessibility Circle
    const accessRing = document.getElementById("lh-access-ring");
    const accessVal = document.getElementById("lh-access-val");
    if (accessRing && accessVal) {
      accessRing.setAttribute("stroke-dasharray", `${data.accessibility}, 100`);
      accessVal.innerText = data.accessibility;
      accessRing.className.baseVal = `ring-fill ${getScoreColorClass(data.accessibility)}`;
    }

    // 3. Update Best Practices Circle
    const bestRing = document.getElementById("lh-best-ring");
    const bestVal = document.getElementById("lh-best-val");
    if (bestRing && bestVal) {
      bestRing.setAttribute("stroke-dasharray", `${data.bestPractices}, 100`);
      bestVal.innerText = data.bestPractices;
      bestRing.className.baseVal = `ring-fill ${getScoreColorClass(data.bestPractices)}`;
    }

    // 4. Update SEO Circle
    const seoRing = document.getElementById("lh-seo-ring");
    const seoVal = document.getElementById("lh-seo-val");
    if (seoRing && seoVal) {
      seoRing.setAttribute("stroke-dasharray", `${data.seo}, 100`);
      seoVal.innerText = data.seo;
      seoRing.className.baseVal = `ring-fill ${getScoreColorClass(data.seo)}`;
    }

    // 5. Update 6 Technical Audit Metrics & Dot Indicators
    const audits = [
      { id: "fcp", key: "fcp" },
      { id: "tbt", key: "tbt" },
      { id: "tti", key: "tti" },
      { id: "lcp", key: "lcp" },
      { id: "si", key: "si" },
      { id: "cls", key: "cls" }
    ];

    audits.forEach(audit => {
      const valNode = document.getElementById(`${audit.id}-val`);
      const dotNode = document.getElementById(`${audit.id}-dot`);
      const auditData = data.audits[audit.key];

      if (valNode && auditData) {
        valNode.innerText = auditData.val;
      }
      if (dotNode && auditData) {
        // Switch dot states
        dotNode.className = `audit-status-dot dot-${auditData.status}`;
      }
    });
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }
})();
