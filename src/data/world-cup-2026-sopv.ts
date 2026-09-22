/**
 * World Cup 2026 cumulative share of promotional voice.
 * Source: Jurnii 360 Tournament Wrap (24 May – 20 July 2026).
 * Intensity-weighted SoPV for named UK/IE operators; bars do not total 100%.
 */

export type WcSopvBrand = {
  name: string;
  color: string;
  /** Cumulative SoPV % for each week in WC_SOPV_WEEKS */
  values: number[];
};

/** Week labels shown as "w/c {label}" */
export const WC_SOPV_WEEKS = [
  '1 Jun',
  '8 Jun',
  '15 Jun',
  '22 Jun',
  '29 Jun',
  '6 Jul',
  '13 Jul',
] as const;

export const WC_SOPV_SERIES: WcSopvBrand[] = [
  { name: 'William Hill', color: '#002D72', values: [6.23, 11.04, 13.44, 13.2, 11.95, 11.7, 11.79] },
  { name: 'Betfred', color: '#2E7CD6', values: [25.37, 14.67, 11.87, 11.44, 10.93, 10.49, 10.17] },
  { name: 'Ladbrokes', color: '#E4002B', values: [12.61, 11.81, 10.04, 8.73, 9.13, 9.62, 10.01] },
  { name: 'Coral', color: '#0046AD', values: [4.25, 6.8, 7.85, 8.67, 9.34, 9.74, 9.93] },
  { name: 'BetVictor', color: '#00857A', values: [0.56, 5.04, 4.99, 4.81, 4.83, 5.06, 5.11] },
  { name: 'Unibet', color: '#1F7A46', values: [0.46, 2.15, 3.05, 3.34, 3.4, 3.56, 3.7] },
  { name: 'bet365', color: '#0B6E4F', values: [10.33, 4.34, 3.08, 2.68, 2.85, 3.32, 3.58] },
  { name: 'Paddy Power', color: '#009A44', values: [11.13, 4.45, 3.36, 3.36, 3.1, 3.23, 3.34] },
  { name: 'Midnite', color: '#7C3AED', values: [0.56, 1.47, 2.33, 2.22, 2.21, 2.49, 2.7] },
  { name: 'Betfair', color: '#C8890A', values: [4.69, 2.47, 1.89, 1.75, 1.8, 1.85, 1.87] },
  { name: 'Sky Bet', color: '#21A1E1', values: [3.44, 1.46, 1.0, 0.88, 0.91, 0.96, 1.2] },
];

export const WC_SOPV_CAPTION =
  'Cumulative intensity-weighted share of promotional voice, named operators. The final frame is the tournament table. Bars do not total 100%: two high-volume odds-only feeds stay in the market denominator. Source: Jurnii 360.';

/** Max value across the series — used to scale bar widths. */
export const WC_SOPV_MAX = Math.max(
  ...WC_SOPV_SERIES.flatMap((b) => b.values)
);
