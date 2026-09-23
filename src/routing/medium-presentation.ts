import { ContentMeta } from '../content-engine/types';

export interface MediumPresentation {
  format: 'article' | 'paper' | 'page' | 'report';
  mediumName: string;
  templateClass: 'ArticleTemplate' | 'PaperTemplate' | 'GeneralPageTemplate' | 'MarketReportTemplate';
}

export function toCanonicalMedium(mediumStr: string = ''): string {
  const m = mediumStr.trim().toLowerCase();
  if (m === 'paper' || m === 'journal' || m === 'proof' || m === 'monograph') {
    return 'Paper';
  }
  if (m === 'market report' || m === 'market-report' || m === 'report') {
    return 'Market Report';
  }
  if (m === 'article' || m === 'essay' || m === 'note' || m === 'post') {
    return 'Article';
  }
  return 'Article';
}

export function resolveMediumPresentation(
  meta: ContentMeta,
  section?: string
): MediumPresentation {
  const rawMedium = meta.medium || meta.templateClass || meta.contentType || meta.format || section || '';
  const canonical = toCanonicalMedium(rawMedium);

  if (canonical === 'Paper') {
    return {
      format: 'paper',
      mediumName: 'Paper',
      templateClass: 'PaperTemplate',
    };
  }

  if (canonical === 'Market Report') {
    return {
      format: 'report',
      mediumName: 'Market Report',
      templateClass: 'MarketReportTemplate',
    };
  }

  if (meta.contentKind === 'page') {
    return {
      format: 'page',
      mediumName: 'Page',
      templateClass: 'GeneralPageTemplate',
    };
  }

  return {
    format: 'article',
    mediumName: 'Article',
    templateClass: 'ArticleTemplate',
  };
}
