import React from 'react';

interface TestimonialQuoteProps {
  quote: string;
  avatar?: string;
  name: string;
  role: string;
}

export const TestimonialQuote: React.FC<TestimonialQuoteProps> = ({ quote, avatar, name, role }) => {
  return (
    <section className="uc-quote section reveal">
      <div className="container">
        <div className="uc-quote-card">
          <blockquote>&ldquo;{quote}&rdquo;</blockquote>
          <div className="uc-quote-author">
            {avatar && <div className="uc-quote-avatar">{avatar}</div>}
            <div>
              <cite className="uc-quote-name">{name}</cite>
              <span className="uc-quote-role">{role}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
