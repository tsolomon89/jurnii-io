import React from 'react';
import { EditorialPageModel } from '../content-engine/types';
import { Prose } from '../components/Prose';

interface ArticleTemplateProps {
  data: EditorialPageModel;
}

export const ArticleTemplate: React.FC<ArticleTemplateProps> = ({ data }) => {
  return (
    <article>
      <header className="article-header">
        <div className="article-header-meta">
          {data.category && (
            <span className="pill solid">
              {data.category}
            </span>
          )}
          {data.date && <span>{data.date}</span>}
          {data.readingTimeMinutes && <span>• {data.readingTimeMinutes} min read</span>}
          {data.author && <span>• By {data.author}</span>}
        </div>
        <h1>
          {data.title}
        </h1>
        {data.excerpt && (
          <p className="article-header-excerpt">
            {data.excerpt}
          </p>
        )}
      </header>

      {data.coverImage && (
        <figure className="article-cover">
          <img src={data.coverImage} alt="" />
        </figure>
      )}

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
