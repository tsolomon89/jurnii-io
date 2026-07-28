import React from 'react';

export const FeatureBenchmark = () => {
  return (
    <section className="section bg-light">
      <div className="container">
        <div className="section-head text-center">
          <h2 className="h2-section">How Jurnii Outpaces the Market</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            A side-by-side comparison of automated intelligence versus traditional retrospective manual setups.
          </p>
        </div>
        <div className="overflow-x-auto mt-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-4 pr-6 font-semibold text-gray-900">Capability</th>
                <th className="py-4 px-6 font-semibold text-brand-primary">Jurnii Intelligence</th>
                <th className="py-4 px-6 font-semibold text-gray-500">Legacy Analytics</th>
                <th className="py-4 pl-6 font-semibold text-gray-500">Manual Agencies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-4 pr-6 font-medium text-gray-900">Audit Frequency</td>
                <td className="py-4 px-6 font-medium text-brand-primary">Continuous Real-Time</td>
                <td className="py-4 px-6 text-gray-500">Ad-Hoc / Event Triggered</td>
                <td className="py-4 pl-6 text-gray-500">Monthly / Retrospective</td>
              </tr>
              <tr>
                <td className="py-4 pr-6 font-medium text-gray-900">Attribution Logic</td>
                <td className="py-4 px-6 font-medium text-brand-primary">Cortex Causal Models</td>
                <td className="py-4 px-6 text-gray-500">First-Click / Last-Click Errors</td>
                <td className="py-4 pl-6 text-gray-500">Subjective / Gut Feel</td>
              </tr>
              <tr>
                <td className="py-4 pr-6 font-medium text-gray-900">Data Structure</td>
                <td className="py-4 px-6 font-medium text-brand-primary">Normalized Promo Richness</td>
                <td className="py-4 px-6 text-gray-500">Raw Text Snippets</td>
                <td className="py-4 pl-6 text-gray-500">Scattered Spreadsheets</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
