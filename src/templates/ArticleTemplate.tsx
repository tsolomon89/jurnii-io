import React, { useEffect, useState } from 'react';
import { EditorialPageModel } from '../content-engine/types';
import { resolveAuthorImage, resolveAuthorRole } from '../content-engine/authors';
import { Prose } from '../components/Prose';
import { LibraryCoverImg } from '../content-engine/cover-fallback';

interface ArticleTemplateProps {
  data: EditorialPageModel;
}

function formatArticleDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function authorInitials(name?: string): string {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const AuthorPhoto: React.FC<{ src?: string; name?: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(!src);
  const initials = authorInitials(name);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed || !src) {
    return (
      <span className="article-author-photo article-author-photo--fallback" aria-hidden="true">
        {initials}
      </span>
    );
  }

  return (
    <img
      className="article-author-photo"
      src={src}
      alt=""
      width={44}
      height={44}
      onError={() => setFailed(true)}
    />
  );
};

export const ArticleTemplate: React.FC<ArticleTemplateProps> = ({ data }) => {
  const dateLabel = formatArticleDate(data.date);
  const authorRole = resolveAuthorRole(data.author, data.authorRole);
  const metaParts = [
    data.category,
    dateLabel,
    data.readingTimeMinutes ? `${data.readingTimeMinutes} min read` : undefined,
  ].filter(Boolean) as string[];

  return (
    <article>
      <header className="article-header">
        <h1>
          {data.title}
        </h1>
        {data.excerpt && (
          <p className="article-header-excerpt">
            {data.excerpt}
          </p>
        )}
        <div className="article-header-byline">
          {data.author && (
            <div className="article-author">
              <AuthorPhoto src={resolveAuthorImage(data.author, data.authorImage)} name={data.author} />
              <div className="article-author-copy">
                <div className="article-author-name">{data.author}</div>
                {authorRole && <div className="article-author-role">{authorRole}</div>}
              </div>
            </div>
          )}
          {metaParts.length > 0 && (
            <p className="article-header-meta">
              {metaParts.map((part, i) => (
                <React.Fragment key={part}>
                  {i > 0 && <span className="article-header-meta-sep" aria-hidden="true"> · </span>}
                  <span>{part}</span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      </header>

      <figure className="article-cover">
        <LibraryCoverImg src={data.coverImage} loading="eager" />
      </figure>

      {data.tableOfContents && data.tableOfContents.length > 0 && (
        <nav className="article-toc">
          <h2>
            Table of Contents
          </h2>
          <ul>
            {data.tableOfContents.map((toc) => (
              <li
                key={toc.id}
                style={{ paddingLeft: `${(toc.level - 1) * 1}rem` }}
              >
                <a href={`#${toc.id}`}>
                  {toc.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main>
        <Prose html={data.bodyHtml} />
      </main>
    </article>
  );
};
