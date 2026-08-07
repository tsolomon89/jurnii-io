import React from 'react';

interface ProseProps {
  html: string;
  className?: string;
}

const KATEX_STYLESHEET = '/assets/vendor/katex/katex.min.css';

/**
 * KaTeX emits both a MathML copy and a styled-span copy of every formula, and relies
 * on its own stylesheet to hide the first and lay out the second. Without it the two
 * render on top of each other as run-together glyphs that overflow the column. Only
 * a couple of papers in the library contain maths, so the stylesheet — and the fonts
 * behind it — is fetched on demand rather than shipped to every page of the site.
 */
function useKatexStylesheet(html: string) {
  const needed = html.includes('class="katex');
  React.useEffect(() => {
    if (!needed || document.querySelector(`link[href="${KATEX_STYLESHEET}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KATEX_STYLESHEET;
    document.head.appendChild(link);
  }, [needed]);
}

export const Prose: React.FC<ProseProps> = ({ html, className = '' }) => {
  useKatexStylesheet(html);

  return (
    <div
      className={`article-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
