import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BOOST_TRAJECTORY_BRANDS,
  BOOST_TRAJECTORY_CAPTION,
  BOOST_TRAJECTORY_CHELTENHAM_IDX,
  BOOST_TRAJECTORY_WEEKS,
  BOOST_TRAJECTORY_X,
  BOOST_TRAJECTORY_Y,
  type BoostTrajectoryBrand,
} from '../../data/boost-trajectory-spring-2026';

const REDUCE =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const WEEK_MS = 850;

const SVG_W = 760;
const SVG_H = 420;
const PAD = { top: 28, right: 28, bottom: 52, left: 56 };

function rgba(rgb: [number, number, number], a: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function scaleX(v: number): number {
  const { min, max } = BOOST_TRAJECTORY_X;
  const inner = SVG_W - PAD.left - PAD.right;
  return PAD.left + ((v - min) / (max - min)) * inner;
}

function scaleY(v: number): number {
  const { min, max } = BOOST_TRAJECTORY_Y;
  const inner = SVG_H - PAD.top - PAD.bottom;
  return PAD.top + (1 - (v - min) / (max - min)) * inner;
}

function pointRadius(count: number): number {
  return Math.max(5, Math.sqrt(count) * 0.72);
}

function deltaLabel(current: number, baseline: number, unit: '%' | 'pp'): { text: string; dir: 'up' | 'down' | 'flat' } {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.08) {
    return { text: `→ flat vs ${baseline.toFixed(1)}${unit} Feb`, dir: 'flat' };
  }
  if (diff > 0) {
    return {
      text: `↑ from ${baseline.toFixed(1)}${unit} Feb`,
      dir: 'up',
    };
  }
  return {
    text: `↓ from ${baseline.toFixed(1)}${unit} Feb`,
    dir: 'down',
  };
}

type VisibleMap = Record<BoostTrajectoryBrand['id'], boolean>;

export const BoostTrajectoryScatter: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastWeek = BOOST_TRAJECTORY_WEEKS.length - 1;
  const [weekIdx, setWeekIdx] = useState(REDUCE ? lastWeek : 0);
  const [playing, setPlaying] = useState(false);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState<VisibleMap>({ wh: true, pp: true, b365: true });
  const [hover, setHover] = useState<{
    brand: string;
    color: string;
    week: string;
    boost: number;
    margin: number;
    count: number;
    cheltenham: boolean;
    x: number;
    y: number;
  } | null>(null);
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
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      setWeekIdx((w) => (w >= lastWeek ? lastWeek : w + 1));
    }, WEEK_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, lastWeek]);

  useEffect(() => {
    if (playing && weekIdx >= lastWeek) {
      const t = setTimeout(() => stop(), WEEK_MS);
      return () => clearTimeout(t);
    }
  }, [weekIdx, playing, lastWeek, stop]);

  const togglePlay = () => {
    if (playing) {
      stop();
      return;
    }
    if (weekIdx >= lastWeek) setWeekIdx(0);
    setPlaying(true);
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    stop();
    setWeekIdx(Number(e.target.value));
  };

  const toggleBrand = (id: BoostTrajectoryBrand['id']) => {
    setVisible((v) => ({ ...v, [id]: !v[id] }));
  };

  const xTicks = [7, 11, 15, 19, 23];
  const yTicks = [0.5, 1.5, 2.5, 3.5, 4.3];

  const series = useMemo(() => {
    return BOOST_TRAJECTORY_BRANDS.map((b) => ({
      ...b,
      slice: b.points.slice(0, weekIdx + 1),
      latest: b.points[weekIdx],
    }));
  }, [weekIdx]);

  return (
    <div className={'bt-scatter' + (seen ? ' is-in' : '')} ref={rootRef}>
      <div className="bt-card">
        <div className="bt-ctl" role="group" aria-label="Trajectory controls">
          <button
            type="button"
            className={'bt-play' + (playing ? ' is-playing' : '')}
            onClick={togglePlay}
            aria-label={playing ? 'Pause trajectory' : 'Play trajectory'}
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

          <div className="bt-brands" role="group" aria-label="Brand filter">
            {BOOST_TRAJECTORY_BRANDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={'bt-chip' + (visible[b.id] ? ' on' : '')}
                onClick={() => toggleBrand(b.id)}
                aria-pressed={visible[b.id]}
              >
                <span className="bt-chip-sw" style={{ background: b.color }} />
                {b.label}
              </button>
            ))}
          </div>

          <input
            type="range"
            className="bt-scrub"
            min={0}
            max={lastWeek}
            step={1}
            value={weekIdx}
            onChange={onScrub}
            aria-label="Show up to week"
            aria-valuetext={BOOST_TRAJECTORY_WEEKS[weekIdx]}
          />

          <span className="bt-week" aria-live="polite">
            {BOOST_TRAJECTORY_WEEKS[weekIdx]}
            <small>
              {weekIdx + 1} of {BOOST_TRAJECTORY_WEEKS.length} weeks
            </small>
          </span>
        </div>

        <div className="bt-kpis">
          {series.map((b) => {
            if (!visible[b.id] || !b.latest) return null;
            const boostDelta = deltaLabel(b.latest.boostPct, b.febBoost, '%');
            const marginDelta = deltaLabel(b.latest.marginPp, b.febMargin, 'pp');
            return (
              <div key={b.id} className="bt-kpi">
                <div className="bt-kpi-brand">
                  <span className="bt-kpi-sw" style={{ background: b.color }} />
                  {b.label}
                </div>
                <div className="bt-kpi-metrics">
                  <div>
                    <div className="bt-kpi-num">{b.latest.boostPct.toFixed(1)}%</div>
                    <div className="bt-kpi-lbl">Median boost</div>
                    <div className={'bt-kpi-delta ' + boostDelta.dir}>{boostDelta.text}</div>
                  </div>
                  <div>
                    <div className="bt-kpi-num">{b.latest.marginPp.toFixed(2)}pp</div>
                    <div className="bt-kpi-lbl">Margin conceded</div>
                    <div className={'bt-kpi-delta ' + marginDelta.dir}>{marginDelta.text}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bt-chart-wrap">
          <div className="bt-chart-head">
            <div>
              <div className="bt-chart-title">Median boost % vs margin conceded</div>
              <div className="bt-chart-sub">Weekly trajectory · earlier weeks darker, later lighter</div>
            </div>
            <div className="bt-chart-hint">Hover points · scrub to replay</div>
          </div>

          <div className="bt-svg-wrap">
            <svg
              className="bt-svg"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              role="img"
              aria-label={`Boost generosity trajectory through week commencing ${BOOST_TRAJECTORY_WEEKS[weekIdx]}`}
              onMouseLeave={() => setHover(null)}
            >
              {/* Grid */}
              {xTicks.map((t) => (
                <line
                  key={'vx' + t}
                  x1={scaleX(t)}
                  x2={scaleX(t)}
                  y1={PAD.top}
                  y2={SVG_H - PAD.bottom}
                  className="bt-grid"
                />
              ))}
              {yTicks.map((t) => (
                <line
                  key={'hy' + t}
                  x1={PAD.left}
                  x2={SVG_W - PAD.right}
                  y1={scaleY(t)}
                  y2={scaleY(t)}
                  className="bt-grid"
                />
              ))}

              {/* Axes labels */}
              {xTicks.map((t) => (
                <text key={'xt' + t} x={scaleX(t)} y={SVG_H - 18} className="bt-tick" textAnchor="middle">
                  {t}%
                </text>
              ))}
              {yTicks.map((t) => (
                <text key={'yt' + t} x={PAD.left - 10} y={scaleY(t) + 3} className="bt-tick" textAnchor="end">
                  {t.toFixed(1)}pp
                </text>
              ))}
              <text x={SVG_W / 2} y={SVG_H - 4} className="bt-axis-title" textAnchor="middle">
                Median boost % (headline generosity)
              </text>
              <text
                x={14}
                y={SVG_H / 2}
                className="bt-axis-title"
                textAnchor="middle"
                transform={`rotate(-90 14 ${SVG_H / 2})`}
              >
                Median margin conceded (pp)
              </text>

              {/* Trajectories + points */}
              {series.map((b) => {
                if (!visible[b.id] || b.slice.length === 0) return null;
                const n = b.slice.length;
                const path = b.slice
                  .map((pt, i) => `${i === 0 ? 'M' : 'L'}${scaleX(pt.boostPct).toFixed(1)},${scaleY(pt.marginPp).toFixed(1)}`)
                  .join(' ');
                return (
                  <g key={b.id}>
                    <path d={path} className="bt-trail" stroke={rgba(b.rgb, 0.28)} fill="none" />
                    {b.slice.map((pt, i) => {
                      const cx = scaleX(pt.boostPct);
                      const cy = scaleY(pt.marginPp);
                      const alpha = 0.25 + 0.75 * (i / Math.max(n - 1, 1));
                      const isLast = i === n - 1;
                      const isChel = b.id === 'pp' && i === BOOST_TRAJECTORY_CHELTENHAM_IDX;
                      return (
                        <g key={b.id + i}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={pointRadius(pt.count)}
                            fill={rgba(b.rgb, alpha)}
                            stroke={rgba(b.rgb, Math.min(1, alpha + 0.2))}
                            strokeWidth={isLast ? 2.5 : 1.4}
                            className="bt-dot"
                            onMouseEnter={() =>
                              setHover({
                                brand: b.label,
                                color: b.color,
                                week: pt.week,
                                boost: pt.boostPct,
                                margin: pt.marginPp,
                                count: pt.count,
                                cheltenham: isChel,
                                x: cx,
                                y: cy,
                              })
                            }
                          />
                          {isChel && (
                            <text x={cx + 12} y={cy - 6} className="bt-chel-label">
                              Cheltenham ↩
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {hover && (
              <div
                className="bt-tip"
                style={{
                  left: `min(calc(${(hover.x / SVG_W) * 100}% + 12px), calc(100% - 11rem))`,
                  top: `max(0px, calc(${(hover.y / SVG_H) * 100}% - 4.5rem))`,
                }}
              >
                <div className="bt-tip-brand" style={{ color: hover.color }}>
                  {hover.brand}
                </div>
                <div>
                  Week: <strong>{hover.week}</strong>
                  {hover.cheltenham ? ' ★' : ''}
                </div>
                <div>
                  Median boost: <strong>{hover.boost.toFixed(2)}%</strong>
                </div>
                <div>
                  Margin conceded: <strong>{hover.margin.toFixed(3)}pp</strong>
                </div>
                <div className="bt-tip-meta">Boosts: {hover.count.toLocaleString()}</div>
                {hover.cheltenham && <div className="bt-tip-chel">Cheltenham activation</div>}
              </div>
            )}
          </div>

          <div className="bt-legend">
            <span>
              <i className="bt-leg-dot" /> Point size = boost volume
            </span>
            <span>
              <i className="bt-leg-dash" /> Dashed line = trajectory
            </span>
            <span>
              <i className="bt-leg-star">★</i> Paddy Power Cheltenham spike
            </span>
          </div>
        </div>

        <p className="bt-caption">{BOOST_TRAJECTORY_CAPTION}</p>
      </div>
    </div>
  );
};
