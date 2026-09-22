/**
 * Boost generosity vs margin conceded — weekly trajectory.
 * Source: Jurnii 360 Boost Intelligence (William Hill · Paddy Power · bet365)
 * Window: 4 Feb – 13 May 2026 (15 weeks). Cheltenham week = 09 Mar.
 */

export type BoostTrajectoryPoint = {
  week: string;
  boostPct: number;
  marginPp: number;
  count: number;
};

export type BoostTrajectoryBrand = {
  id: 'wh' | 'pp' | 'b365';
  label: string;
  /** Brand colour for chart + KPI chrome */
  color: string;
  /** RGB for alpha fades */
  rgb: [number, number, number];
  /** February baseline (first comparable week used in cards) */
  febBoost: number;
  febMargin: number;
  points: BoostTrajectoryPoint[];
};

export const BOOST_TRAJECTORY_WEEKS = [
  '02 Feb',
  '09 Feb',
  '16 Feb',
  '23 Feb',
  '02 Mar',
  '09 Mar',
  '16 Mar',
  '23 Mar',
  '30 Mar',
  '06 Apr',
  '13 Apr',
  '20 Apr',
  '27 Apr',
  '04 May',
  '11 May',
] as const;

/** Index of Paddy Power Cheltenham spike (09 Mar). */
export const BOOST_TRAJECTORY_CHELTENHAM_IDX = 5;

export const BOOST_TRAJECTORY_BRANDS: BoostTrajectoryBrand[] = [
  {
    id: 'wh',
    label: 'William Hill',
    color: '#38BDF8',
    rgb: [56, 189, 248],
    febBoost: 10.0,
    febMargin: 1.28,
    points: [
      { week: '02 Feb', boostPct: 11.11, marginPp: 1.282, count: 81 },
      { week: '09 Feb', boostPct: 10.0, marginPp: 1.282, count: 109 },
      { week: '16 Feb', boostPct: 11.11, marginPp: 1.026, count: 129 },
      { week: '23 Feb', boostPct: 10.0, marginPp: 0.952, count: 99 },
      { week: '02 Mar', boostPct: 11.11, marginPp: 1.515, count: 91 },
      { week: '09 Mar', boostPct: 12.5, marginPp: 1.923, count: 331 },
      { week: '16 Mar', boostPct: 13.64, marginPp: 2.222, count: 229 },
      { week: '23 Mar', boostPct: 11.11, marginPp: 1.923, count: 278 },
      { week: '30 Mar', boostPct: 14.57, marginPp: 2.473, count: 312 },
      { week: '06 Apr', boostPct: 14.29, marginPp: 2.339, count: 331 },
      { week: '13 Apr', boostPct: 18.18, marginPp: 3.077, count: 267 },
      { week: '20 Apr', boostPct: 20.0, marginPp: 3.333, count: 331 },
      { week: '27 Apr', boostPct: 16.67, marginPp: 2.778, count: 369 },
      { week: '04 May', boostPct: 18.18, marginPp: 3.03, count: 234 },
      { week: '11 May', boostPct: 20.0, marginPp: 3.571, count: 92 },
    ],
  },
  {
    id: 'pp',
    label: 'Paddy Power',
    color: '#00A651',
    rgb: [0, 166, 81],
    febBoost: 11.1,
    febMargin: 1.82,
    points: [
      { week: '02 Feb', boostPct: 11.11, marginPp: 1.818, count: 35 },
      { week: '09 Feb', boostPct: 12.5, marginPp: 1.581, count: 64 },
      { week: '16 Feb', boostPct: 11.11, marginPp: 1.515, count: 25 },
      { week: '23 Feb', boostPct: 12.5, marginPp: 1.818, count: 41 },
      { week: '02 Mar', boostPct: 12.5, marginPp: 1.818, count: 54 },
      { week: '09 Mar', boostPct: 17.43, marginPp: 2.5, count: 216 },
      { week: '16 Mar', boostPct: 11.11, marginPp: 1.667, count: 157 },
      { week: '23 Mar', boostPct: 11.11, marginPp: 1.111, count: 147 },
      { week: '30 Mar', boostPct: 11.11, marginPp: 1.581, count: 228 },
      { week: '06 Apr', boostPct: 10.0, marginPp: 1.667, count: 271 },
      { week: '13 Apr', boostPct: 11.11, marginPp: 1.515, count: 154 },
      { week: '20 Apr', boostPct: 11.11, marginPp: 1.732, count: 152 },
      { week: '27 Apr', boostPct: 11.11, marginPp: 1.515, count: 165 },
      { week: '04 May', boostPct: 11.11, marginPp: 1.667, count: 190 },
      { week: '11 May', boostPct: 11.11, marginPp: 1.515, count: 89 },
    ],
  },
  {
    id: 'b365',
    label: 'bet365',
    color: '#F59E0B',
    rgb: [245, 158, 11],
    febBoost: 12.5,
    febMargin: 1.43,
    points: [
      { week: '02 Feb', boostPct: 12.5, marginPp: 1.427, count: 159 },
      { week: '09 Feb', boostPct: 12.5, marginPp: 1.282, count: 248 },
      { week: '16 Feb', boostPct: 12.5, marginPp: 1.282, count: 241 },
      { week: '23 Feb', boostPct: 12.5, marginPp: 1.389, count: 167 },
      { week: '02 Mar', boostPct: 13.33, marginPp: 1.282, count: 281 },
      { week: '09 Mar', boostPct: 14.29, marginPp: 1.471, count: 315 },
      { week: '16 Mar', boostPct: 13.07, marginPp: 1.425, count: 404 },
      { week: '23 Mar', boostPct: 12.5, marginPp: 1.282, count: 358 },
      { week: '30 Mar', boostPct: 13.33, marginPp: 1.389, count: 344 },
      { week: '06 Apr', boostPct: 14.29, marginPp: 1.282, count: 375 },
      { week: '13 Apr', boostPct: 14.55, marginPp: 1.386, count: 359 },
      { week: '20 Apr', boostPct: 13.33, marginPp: 1.389, count: 399 },
      { week: '27 Apr', boostPct: 12.86, marginPp: 1.282, count: 315 },
      { week: '04 May', boostPct: 14.29, marginPp: 1.282, count: 267 },
      { week: '11 May', boostPct: 14.29, marginPp: 1.19, count: 104 },
    ],
  },
];

export const BOOST_TRAJECTORY_CAPTION =
  'Median headline boost % against median margin conceded, weekly. Point size scales with boost volume. Earlier weeks are darker; later weeks lighter. Source: Jurnii 360.';

/** Chart domain (matches Quill original). */
export const BOOST_TRAJECTORY_X = { min: 7, max: 23 };
export const BOOST_TRAJECTORY_Y = { min: 0.5, max: 4.3 };
