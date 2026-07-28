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
  const host = hostname.toLowerCase();
  if (host.startsWith('library.') || host.includes('library')) {
    return SURFACES.library;
  }
  return SURFACES.www;
}

export function getCanonicalUrl(pathName: string, hostname: string = ''): string {
  const surface = resolveSurface(hostname);
  const base = surface.subdomain ? `https://${surface.domain}` : `https://${SURFACES.www.domain}`;
  const cleanPath = pathName.startsWith('/') ? pathName : `/${pathName}`;
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
