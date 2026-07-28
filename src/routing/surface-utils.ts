export interface SurfaceConfig {
  id: string;
  role: 'www' | 'library';
  domain: string;
  subdomain?: string;
  defaultTitle: string;
  defaultDescription: string;
}

export const SURFACES: Record<string, SurfaceConfig> = {
  www: {
    id: 'www',
    role: 'www',
    domain: 'jurnii.io',
    defaultTitle: 'Jurnii · Commercial Intelligence Platform for iGaming Operators',
    defaultDescription: 'Jurnii automates UX benchmarking and competitor proposition tracking for iGaming operators.',
  },
  library: {
    id: 'library',
    role: 'library',
    domain: 'library.jurnii.io',
    subdomain: 'library',
    defaultTitle: 'Library · Jurnii Research & Papers',
    defaultDescription: 'Monographs, research papers, and technical essays by Jurnii.',
  },
};

export function resolveSurface(hostname: string = ''): SurfaceConfig {
  const host = hostname.toLowerCase().trim();
  if (
    host.startsWith('library.') ||
    host === 'library.jurnii.io' ||
    host.includes('library.localhost') ||
    (typeof window !== 'undefined' && window.location.search.includes('surface=library'))
  ) {
    return SURFACES.library;
  }
  return SURFACES.www;
}

export function getCanonicalUrl(pathName: string, hostname: string = ''): string {
  const surface = resolveSurface(hostname);
  let cleanPath = pathName.startsWith('/') ? pathName : `/${pathName}`;

  if (surface.role === 'library') {
    const base = `https://${SURFACES.library.domain}`;
    if (cleanPath.startsWith('/library/')) {
      cleanPath = cleanPath.replace(/^\/library/, '');
    } else if (cleanPath === '/library') {
      cleanPath = '/';
    }
    return `${base}${cleanPath || '/'}`;
  }

  const base = `https://${SURFACES.www.domain}`;
  if (!cleanPath.startsWith('/library/') && pathName.includes('/content/library/')) {
    const slug = pathName.split('/').pop()?.replace(/\.md$/, '') || '';
    cleanPath = `/library/${slug}`;
  }
  return `${base}${cleanPath}`;
}

export function resolveSurfaceHeaders(hostname: string): Record<string, string> {
  const surface = resolveSurface(hostname);
  return {
    'x-surface-role': surface.role,
    'x-tenant-id': surface.id,
    'x-tenant-domain': surface.domain,
  };
}

