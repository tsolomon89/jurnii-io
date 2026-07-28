import React from 'react';

interface DecisionRow {
  decision: string;
  signal: string;
  output: string;
}

export const DecisionMap = ({ heading, rows }: { heading?: string; rows: DecisionRow[] }) => {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" />Strategic Decisions</p>
          <h2 className="h2-section">{heading || 'Strategic Decision Map'}</h2>
        </div>
        <div className="overflow-x-auto" style={{ overflowX: 'auto' }}>
          <table className="decision-map-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #e5e7eb)' }}>
                <th style={{ padding: '1rem 1rem 1rem 0', fontWeight: 600, fontSize: 'var(--text-sm, 14px)' }}>Critical Decision</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: 'var(--text-sm, 14px)' }}>Information Signal Needed</th>
                <th style={{ padding: '1rem 0 1rem 1rem', fontWeight: 600, fontSize: 'var(--text-sm, 14px)', color: 'var(--brand-primary, #10B981)' }}>Jurnii Output</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}>
                  <td style={{ padding: '1rem 1rem 1rem 0', fontWeight: 500, fontSize: 'var(--text-sm, 14px)' }}>{row.decision}</td>
                  <td style={{ padding: '1rem', fontSize: 'var(--text-sm, 14px)', color: 'var(--muted-foreground)' }}>{row.signal}</td>
                  <td style={{ padding: '1rem 0 1rem 1rem', fontSize: 'var(--text-sm, 14px)', fontWeight: 500, color: 'var(--brand-primary, #10B981)' }}>{row.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
