import React, { useEffect, useState } from 'react';

export const LIBRARY_COVER_FALLBACK = '/assets/library/cover-fallback.jpg';

interface LibraryCoverImgProps {
  src?: string;
  loading?: 'lazy' | 'eager';
}

/** Cover art, or the branded 3:2 fallback if the file is missing or 404s. */
export const LibraryCoverImg: React.FC<LibraryCoverImgProps> = ({ src, loading = 'lazy' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      src={failed || !src ? LIBRARY_COVER_FALLBACK : src}
      alt=""
      loading={loading}
      onError={() => {
        if (failed || !src) return;
        setFailed(true);
      }}
    />
  );
};
