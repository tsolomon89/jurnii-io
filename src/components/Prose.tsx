import React from 'react';

interface ProseProps {
  html: string;
  className?: string;
}

export const Prose: React.FC<ProseProps> = ({ html, className = '' }) => {
  return (
    <div
      className={`article-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
