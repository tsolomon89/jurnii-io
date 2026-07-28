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
    <section className="section bg-light">
      <div className="container">
        <div className="section-head text-center">
          <h2 className="h2-section">{heading || 'How Jurnii Outpaces the Market'}</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto" style={{ marginTop: '1rem', color: 'var(--muted-foreground)', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto' }}>
            {lede || 'A side-by-side comparison of automated intelligence versus traditional retrospective manual setups.'}
          </p>
        </div>
        <div className="overflow-x-auto" style={{ overflowX: 'auto', marginTop: '3rem' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
                <th style={{ padding: '1rem 1.5rem 1rem 0', fontWeight: 600 }}>Capability</th>
                {displayCols.map((col, i) => (
                  <th key={i} style={{ padding: '1rem 1.5rem', fontWeight: 600, color: i === 0 ? 'var(--brand-primary, #10B981)' : 'var(--muted-foreground)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}>
                  <td style={{ padding: '1rem 1.5rem 1rem 0', fontWeight: 500 }}>{row.feat}</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--brand-primary, #10B981)' }}>{row.jurnii}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>{row.legacy}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>{row.manual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
