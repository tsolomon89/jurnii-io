import React from 'react';

interface BenchmarkRow {
  feat: string;
  jurnii: string;
  legacy: string;
  manual: string;
}

interface FeatureBenchmarkProps {
  heading?: string;
  lede?: string;
  cols?: string[];
  rows?: BenchmarkRow[];
}

const DEFAULT_COLS = ['Jurnii Intelligence', 'Legacy Analytics', 'Manual Agencies'];
const DEFAULT_ROWS: BenchmarkRow[] = [
  { feat: 'Audit Frequency', jurnii: 'Continuous Real-Time', legacy: 'Ad-Hoc / Event Triggered', manual: 'Monthly / Retrospective' },
  { feat: 'Attribution Logic', jurnii: 'Cortex Causal Models', legacy: 'First-Click / Last-Click Errors', manual: 'Subjective / Gut Feel' },
  { feat: 'Data Structure', jurnii: 'Normalized Promo Richness', legacy: 'Raw Text Snippets', manual: 'Scattered Spreadsheets' },
  { feat: 'UX Recommendations', jurnii: '70+ Ranked Heuristics', legacy: 'Simple Funnel Dropout Counts', manual: 'High-Level Consultant Slideware' },
  { feat: 'Jurisdictional Coverage', jurnii: '35 Simultaneous Markets', legacy: 'Single Market / Restricted', manual: 'Local Only' },
];

export const FeatureBenchmark = ({ heading, lede, cols, rows }: FeatureBenchmarkProps) => {
  const displayCols = cols || DEFAULT_COLS;
  const displayRows = rows || DEFAULT_ROWS;

  return (
    <section className="uc-benchmark section reveal">
      <div className="container">
        <div className="section-head centered">
          <p className="eyebrow"><span className="dot" />Performance Matrix</p>
          <h2 className="h2-section">{heading || 'How Jurnii Outpaces the Market'}</h2>
          <p className="section-lede">
            {lede || 'A side-by-side comparison of automated intelligence versus traditional retrospective manual setups.'}
          </p>
        </div>
        <div className="uc-table-card">
          <table className="uc-table">
            <thead>
              <tr>
                <th>Capabilities Matrix</th>
                <th className="jcol">{displayCols[0]}</th>
                <th>{displayCols[1]}</th>
                <th>{displayCols[2]}</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i}>
                  <td className="feat">{row.feat}</td>
                  <td className="jcol">
                    <span className="uc-badge">
                      <i data-lucide="check" style={{ width: 13, height: 13 }} /> {row.jurnii}
                    </span>
                  </td>
                  <td>{row.legacy}</td>
                  <td>{row.manual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
