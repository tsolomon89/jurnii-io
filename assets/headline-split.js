/* =========================================================================
   Headline second-line styling
   Greys every visual line after the first in every H1 / H2 across the site.
   - Theme-aware: uses the --muted-foreground token (passes contrast on every theme)
   - Preserves words that carry their own inline colour (e.g. brand-green spans)
   - Re-measures on resize so it stays correct as headlines reflow
   - Runs via MutationObserver so it catches React-rendered content
   ========================================================================= */
(function () {
  var SELECTOR = 'h1, h2';
  var orig = new WeakMap();   // heading -> original innerHTML (for re-runs)
  var observer = null;

  // Does this element set its own text colour? (so we don't override it)
  function hasOwnColor(el) {
    if (el.style && el.style.color) return true;
    // also catch class-driven colour (e.g. theme-aware brand spans)
    try {
      var c = getComputedStyle(el).color;
      var p = el.parentElement ? getComputedStyle(el.parentElement).color : c;
      return c !== p;
    } catch (e) { return false; }
  }

  // Wrap every word in <span class="hl-w">, recursing into child elements and
  // carrying down a "protected" flag for words inside an inline-coloured element.
  function wrapWords(node, protectedColor) {
    var kids = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { // text node
        if (!/\S/.test(n.nodeValue)) continue;
        var parts = n.nodeValue.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        for (var p = 0; p < parts.length; p++) {
          var part = parts[p];
          if (part === '') continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var s = document.createElement('span');
            s.className = 'hl-w';
            if (protectedColor) s.setAttribute('data-keep', '1');
            s.textContent = part;
            frag.appendChild(s);
          }
        }
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) { // element
        if (n.tagName === 'BR') continue;
        if (n.classList && n.classList.contains('hl-w')) continue;
        wrapWords(n, protectedColor || hasOwnColor(n));
      }
    }
  }

  // Collapse consecutive per-word spans that share the same styling into a
  // single span (or plain text, if unstyled) so the final markup only wraps
  // the part of the heading that actually needs its own colour — not every
  // individual word. Recurses into nested elements (e.g. a pre-existing
  // brand-coloured span) so their own word-spans get simplified too, without
  // touching the wrapper element itself.
  function collapseRuns(parent) {
    var kids = Array.prototype.slice.call(parent.childNodes);
    var out = [];
    var buf = '', bufGrey = null, pendingWS = '';

    function flush() {
      if (buf === '') return;
      if (bufGrey) {
        var s = document.createElement('span');
        s.className = 'hl-w hl-2';
        s.textContent = buf;
        out.push(s);
      } else {
        out.push(document.createTextNode(buf));
      }
      buf = ''; bufGrey = null;
    }

    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) {
        if (!/\S/.test(n.nodeValue)) { pendingWS += n.nodeValue; continue; }
        flush();
        if (pendingWS) { out.push(document.createTextNode(pendingWS)); pendingWS = ''; }
        out.push(document.createTextNode(n.nodeValue));
        continue;
      }
      if (n.nodeType !== 1) continue;
      if (n.classList && n.classList.contains('hl-w')) {
        var grey = n.classList.contains('hl-2');
        if (buf !== '' && grey === bufGrey) {
          buf += pendingWS + n.textContent;
          pendingWS = '';
        } else {
          flush();
          if (pendingWS) { out.push(document.createTextNode(pendingWS)); pendingWS = ''; }
          buf = n.textContent;
          bufGrey = grey;
        }
      } else {
        flush();
        if (pendingWS) { out.push(document.createTextNode(pendingWS)); pendingWS = ''; }
        collapseRuns(n);
        out.push(n);
      }
    }
    flush();
    if (pendingWS) out.push(document.createTextNode(pendingWS));

    while (parent.firstChild) parent.removeChild(parent.firstChild);
    for (var j = 0; j < out.length; j++) parent.appendChild(out[j]);
  }

  var isMutating = false;

  function splitOne(h, isResizePass) {
    if (!h || h.getAttribute('data-no-split') === '1') return;
    if (!h.textContent || !h.textContent.trim()) return;

    var currentText = h.textContent;
    if (h.getAttribute('data-hl-split') === currentText && !isResizePass) return;

    // store pristine markup the first time we touch this heading; on every
    // later pass restore it first so re-measuring always starts from
    // individual words (a prior pass may have collapsed runs into fewer,
    // multi-word spans, which would measure too coarsely otherwise).
    if (!orig.has(h)) orig.set(h, h.innerHTML);
    else h.innerHTML = orig.get(h);

    wrapWords(h, false);
    var words = h.querySelectorAll('.hl-w');
    if (!words.length) return;

    // hidden headings measure as a single line — skip until visible
    if (!h.offsetParent && getComputedStyle(h).position !== 'fixed') return;

    var firstTop = Infinity, firstH = 0;
    for (var i = 0; i < words.length; i++) {
      var t = words[i].offsetTop;
      if (t < firstTop) { firstTop = t; firstH = words[i].offsetHeight; }
    }
    var thresh = Math.max(4, firstH * 0.5);
    for (var j = 0; j < words.length; j++) {
      var w = words[j];
      if (w.offsetTop > firstTop + thresh && w.getAttribute('data-keep') !== '1') {
        w.classList.add('hl-2');
      } else {
        w.classList.remove('hl-2');
      }
    }

    // Merge the per-word measuring spans back down: only the run of
    // second-line-and-below words needs a span; everything else collapses
    // to plain text.
    collapseRuns(h);
    h.setAttribute('data-hl-split', currentText);
  }

  function processAll(isResizePass) {
    if (isMutating) return;
    isMutating = true;
    if (observer) observer.disconnect();
    try {
      var heads = document.querySelectorAll(SELECTOR);
      for (var i = 0; i < heads.length; i++) splitOne(heads[i], isResizePass);
    } finally {
      isMutating = false;
      connect();
    }
  }

  // On resize, re-split (splitOne restores pristine markup before re-wrapping).
  var rzTimer = null;
  function onResize() {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(function () { processAll(true); }, 150);
  }

  var moTimer = null;
  function connect() {
    if (!observer) {
      observer = new MutationObserver(function () {
        if (isMutating) return;
        clearTimeout(moTimer);
        moTimer = setTimeout(function () { processAll(false); }, 80);
      });
    }
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function boot() {
    processAll(false);
    // catch late React mounts / async content
    setTimeout(function () { processAll(false); }, 300);
    setTimeout(function () { processAll(false); }, 1200);
    window.addEventListener('resize', onResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
