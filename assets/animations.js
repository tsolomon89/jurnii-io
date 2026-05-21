/**
 * Jurnii Scroll-Based Visual Interaction & Animation Engine
 * Governs Counter Increments, Funnel Progress fills, and Viewport Entrance reveals
 */
(function () {
  "use strict";

  // Counter animation helper
  function animateCounter(element, start, end, duration, prefix = "", suffix = "") {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentValue = Math.floor(progress * (end - start) + start);
      element.innerText = `${prefix}${currentValue.toLocaleString()}${suffix}`;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.innerText = `${prefix}${end.toLocaleString()}${suffix}`;
      }
    };
    window.requestAnimationFrame(step);
  }

  // Main scroll observer initialization
  function initAnimations() {
    const animationTargets = document.querySelectorAll(".animate-on-scroll");
    
    if (!animationTargets.length) return;

    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries, selfObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          
          // Mark as visible to trigger CSS transforms
          target.classList.add("is-visible");

          // Check if this target is or contains a progressive progress bar
          const progressBars = target.querySelectorAll(".funnel-progress-fill");
          progressBars.forEach(bar => {
            const targetWidth = bar.getAttribute("data-target-width") || "0%";
            bar.style.width = targetWidth;
          });

          // Check if this target is a numeric count-up stat
          if (target.classList.contains("count-up-stat")) {
            const targetValAttr = target.getAttribute("data-target-value");
            if (targetValAttr !== null) {
              const endVal = parseInt(targetValAttr, 10) || 0;
              const prefix = target.getAttribute("data-prefix") || "";
              const suffix = target.getAttribute("data-suffix") || "";
              const duration = parseInt(target.getAttribute("data-duration"), 10) || 1200;
              animateCounter(target, 0, endVal, duration, prefix, suffix);
            }
          }

          // Unobserve once active to prevent duplicate triggers
          selfObserver.unobserve(target);
        }
      });
    }, observerOptions);

    animationTargets.forEach(element => {
      observer.observe(element);
    });
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAnimations);
  } else {
    initAnimations();
  }
})();
