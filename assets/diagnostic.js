/**
 * Jurnii Brand IQ Diagnostic Calculator
 * Governs calculation logic, parameter mapping, and glassmorphic results updating.
 */
(function () {
  "use strict";

  // Elements mapping
  let budgetSlider, marketsSlider, hoursSlider;
  let budgetVal, marketsVal, hoursVal;
  let scoreNum, ratingBadge;
  let annualLeakageMetric, overheadMetric, latencyMetric;

  function initDiagnostic() {
    budgetSlider = document.getElementById("diag-budget");
    marketsSlider = document.getElementById("diag-markets");
    hoursSlider = document.getElementById("diag-hours");

    budgetVal = document.getElementById("diag-budget-val");
    marketsVal = document.getElementById("diag-markets-val");
    hoursVal = document.getElementById("diag-hours-val");

    scoreNum = document.getElementById("diag-score");
    ratingBadge = document.getElementById("diag-rating");

    annualLeakageMetric = document.getElementById("diag-leakage");
    overheadMetric = document.getElementById("diag-overhead");
    latencyMetric = document.getElementById("diag-latency");

    if (!budgetSlider || !marketsSlider || !hoursSlider) return;

    // Bind event listeners
    [budgetSlider, marketsSlider, hoursSlider].forEach(slider => {
      slider.addEventListener("input", calculateIQ);
      slider.addEventListener("change", calculateIQ);
    });

    // Run initial calculation
    calculateIQ();
  }

  // Format monetary value beautifully
  function formatCurrency(value) {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    return `€${Math.round(value).toLocaleString()}`;
  }

  function calculateIQ() {
    const budgetMonthly = parseFloat(budgetSlider.value);
    const marketsCount = parseInt(marketsSlider.value, 10);
    const manualHoursWeekly = parseInt(hoursSlider.value, 10);

    // Update slider badges
    budgetVal.innerText = formatCurrency(budgetMonthly);
    marketsVal.innerText = `${marketsCount} market${marketsCount > 1 ? "s" : ""}`;
    hoursVal.innerText = `${manualHoursWeekly} hr${manualHoursWeekly > 1 ? "s" : ""}/wk`;

    // 1. Estimate Causal ROI Leakage
    // Base leakage is 4.5% of promotional budget, scaling with complexity (markets & manual labor friction)
    let leakagePercent = 0.045 + (marketsCount * 0.004) + (manualHoursWeekly * 0.0008);
    // Cap leakage percent between 4.5% and 18% of spend
    leakagePercent = Math.min(Math.max(leakagePercent, 0.045), 0.18);
    const annualSpend = budgetMonthly * 12;
    const annualLeakage = annualSpend * leakagePercent;

    // 2. Estimate Manual Overhead Cost
    // Fully burdened operator labor cost estimated at €48/hour
    const annualHours = manualHoursWeekly * 52;
    const laborBurdenCost = annualHours * 48;

    // 3. Estimate Speed-to-Insight Lag
    // Speed lag in days to fetch, clean, benchmark and reconcile competitor promotion campaign timelines
    let speedLagDays = (marketsCount * 0.4) + (manualHoursWeekly * 0.08) + 1.2;
    speedLagDays = Math.min(Math.max(speedLagDays, 1.5), 14);

    // 4. Calculate Unified Brand IQ Score
    // Starts at 95, penalizes for operational inefficiency and opacity
    let score = 95 - (manualHoursWeekly * 0.55) - (marketsCount * 0.85);
    // Cap score boundaries
    score = Math.min(Math.max(Math.round(score), 28), 92);

    // Update visual numbers
    annualLeakageMetric.innerText = formatCurrency(annualLeakage);
    overheadMetric.innerText = formatCurrency(laborBurdenCost);
    latencyMetric.innerText = `${speedLagDays.toFixed(1)} days`;
    scoreNum.innerText = `${score}/100`;

    // Update Rating Badge state classes
    ratingBadge.className = "diagnostic-rating-badge";
    if (score < 45) {
      ratingBadge.classList.add("fail");
      ratingBadge.innerText = "Critical Leakage";
    } else if (score >= 45 && score < 72) {
      ratingBadge.classList.add("warn");
      ratingBadge.innerText = "Vulnerable";
    } else {
      ratingBadge.classList.add("success");
      ratingBadge.innerText = "Optimizing";
    }
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDiagnostic);
  } else {
    initDiagnostic();
  }
})();
