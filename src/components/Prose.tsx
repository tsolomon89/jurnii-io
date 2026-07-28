import React from 'react';

interface ProseProps {
  html: string;
  className?: string;
}

export const Prose: React.FC<ProseProps> = ({ html, className = '' }) => {
  return (
    <div
      className={`prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
