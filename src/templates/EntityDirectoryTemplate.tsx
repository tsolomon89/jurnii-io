import React from 'react';
import { ContentItem } from '../content-engine/types';

interface EntityDirectoryTemplateProps {
  title: string;
  description?: string;
  items: ContentItem[];
  sectionPath: string;
}

export const EntityDirectoryTemplate: React.FC<EntityDirectoryTemplateProps> = ({
  title,
  description,
  items,
  sectionPath,
}) => {
  return (
    <div className="directory-page">
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow"><span className="dot" />{sectionPath.toUpperCase()}</p>
          <h1 className="h1-page">{title}</h1>
          {description && <p className="page-hero-lede">{description}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="feature-grid">
            {items.map((item) => (
              <a
                key={item.slug}
                href={`/${sectionPath}/${item.slug}`}
                className="feature-cell"
                style={{ textDecoration: 'none' }}
              >
                {item.meta.category && (
                  <p className="eyebrow">{item.meta.category}</p>
                )}
                <h3>{item.meta.title}</h3>
                <p>{item.meta.excerpt || item.meta.description || ''}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
