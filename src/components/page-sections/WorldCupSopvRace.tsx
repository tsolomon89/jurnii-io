import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WC_SOPV_CAPTION,
  WC_SOPV_MAX,
  WC_SOPV_SERIES,
  WC_SOPV_WEEKS,
} from '../../data/world-cup-2026-sopv';

const REDUCE =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const WEEK_MS = 900;
const ROW_H = 32;

function formatPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export const WorldCupSopvRace: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastWeek = WC_SOPV_WEEKS.length - 1;
  const [week, setWeek] = useState(REDUCE ? lastWeek : 0);
  const [playing, setPlaying] = useState(false);
  const [seen, setSeen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-play once when first seen (unless reduced motion).
  useEffect(() => {
    if (!seen || REDUCE) return;
    setPlaying(true);
  }, [seen]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setWeek((w) => {
        if (w >= lastWeek) {
          // Pause on final frame; caller clears playing via effect below.
          return lastWeek;
        }
        return w + 1;
      });
    }, WEEK_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, lastWeek]);

  // Stop when we hit the final week while playing.
  useEffect(() => {
    if (playing && week >= lastWeek) {
      // Allow one beat on the final frame, then stop.
      const t = setTimeout(() => stop(), WEEK_MS);
      return () => clearTimeout(t);
    }
  }, [week, playing, lastWeek, stop]);

  const togglePlay = () => {
    if (playing) {
      stop();
      return;
    }
    if (week >= lastWeek) setWeek(0);
    setPlaying(true);
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    stop();
    setWeek(Number(e.target.value));
  };

  const ranked = useMemo(() => {
    return WC_SOPV_SERIES.map((b) => ({
      name: b.name,
      color: b.color,
      value: b.values[week] ?? 0,
    })).sort((a, b) => b.value - a.value);
  }, [week]);

  // Stable rank → Y position map (by name) for smooth reordering.
  const rankIndex = useMemo(() => {
    const map: Record<string, number> = {};
    ranked.forEach((r, i) => {
      map[r.name] = i;
    });
    return map;
  }, [ranked]);

  const chartH = WC_SOPV_SERIES.length * ROW_H;

  return (
    <div className={'wc-race' + (seen ? ' is-in' : '')} ref={rootRef}>
      <div className="wc-race-card">
        <div className="wc-race-ctl" role="group" aria-label="Race controls">
          <button
            type="button"
            className={'wc-race-play' + (playing ? ' is-playing' : '')}
            onClick={togglePlay}
            aria-label={playing ? 'Pause race' : 'Play race'}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>

          <input
            type="range"
            className="wc-race-scrub"
            min={0}
            max={lastWeek}
            step={1}
            value={week}
            onChange={onScrub}
            aria-label="Tournament week"
            aria-valuetext={`w/c ${WC_SOPV_WEEKS[week]}`}
          />

          <span className="wc-race-week" aria-live="polite">
            w/c {WC_SOPV_WEEKS[week]}
          </span>
        </div>

        <div
          className="wc-race-chart"
          style={{ height: chartH }}
          role="img"
          aria-label={`Share of promotional voice race, week commencing ${WC_SOPV_WEEKS[week]}`}
        >
          {WC_SOPV_SERIES.map((b) => {
            const value = b.values[week] ?? 0;
            const y = (rankIndex[b.name] ?? 0) * ROW_H;
            const widthPct = WC_SOPV_MAX > 0 ? (value / WC_SOPV_MAX) * 100 : 0;
            return (
              <div
                key={b.name}
                className="wc-race-row"
                style={{ transform: `translateY(${y}px)` }}
              >
                <div className="wc-race-name">{b.name}</div>
                <div className="wc-race-track">
                  <div
                    className="wc-race-bar"
                    style={{
                      background: b.color,
                      width: `${widthPct}%`,
                    }}
                  />
                  <span
                    className="wc-race-val"
                    style={{ left: `min(${widthPct}%, calc(100% - 3.5rem))` }}
                  >
                    {formatPct(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="wc-race-caption">{WC_SOPV_CAPTION}</p>
      </div>
    </div>
  );
};
