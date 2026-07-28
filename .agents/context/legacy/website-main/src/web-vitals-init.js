import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

/**
 * Report Core Web Vitals. Logs in all environments; hooks window.__CWV__ for CI/RUM.
 */
export function reportWebVitals(onReport) {
  const send = typeof onReport === 'function'
    ? onReport
    : (metric) => {
        try {
          window.__CWV__ = window.__CWV__ || {};
          window.__CWV__[metric.name] = metric;
        } catch {}
        if (typeof console !== 'undefined' && console.debug) {
          console.debug('[CWV]', metric.name, metric.value, metric);
        }
      };

  onCLS(send);
  onINP(send);
  onLCP(send);
  onFCP(send);
  onTTFB(send);
}
