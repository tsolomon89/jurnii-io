import { z } from 'zod';

export const VALID_LENS_FORMAT_COMBINATIONS = [
  ['jurnii-ux', 'full-market'],
  ['jurnii-ux', 'brand-comparison'],
  ['jurnii-ux', 'change-detection'],
  ['jurnii-360', 'full-market'],
  ['jurnii-360', 'brand-comparison'],
  ['combined', 'full-market'],
  ['combined', 'brand-comparison'],
] as const;

export const ComparisonUnitSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  market: z.string().min(2, 'Market code is required'),
});

export const CohortSchema = z.object({
  comparisonUnits: z.array(ComparisonUnitSchema).min(1, 'At least one comparison unit is required'),
  markets: z.array(z.string()).min(1, 'At least one market is required'),
});

export const AnalysisPeriodSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

export const MarketReportSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().optional(),
    medium: z.literal('Market Report'),
    category: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    author: z.string().default('Jurnii Research'),
    description: z.string().optional(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    isIndexable: z.boolean().default(true),
    noindex: z.boolean().optional(),
    isLegacyRegionalReport: z.boolean().optional(),

    // Core taxonomy
    reportLens: z.enum(['jurnii-ux', 'jurnii-360', 'combined']),
    reportFormat: z.enum(['full-market', 'brand-comparison', 'change-detection']),
    productRefs: z.array(z.string()),

    // Temporal telemetry
    analysisPeriod: AnalysisPeriodSchema,
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf must be YYYY-MM-DD'),
    sourceCapturedAt: z.string().min(1, 'sourceCapturedAt is required'),
    comparisonMode: z.enum(['snapshot', 'delta', 'trajectory', 'event-window', 'before-after']),

    // Cohort & evidence bindings
    cohort: CohortSchema,
    evidenceManifest: z.string().min(1, 'evidenceManifest path is required'),
    socialPackage: z.string().min(1, 'socialPackage path is required'),
    dataFreshnessNote: z.string().min(1, 'dataFreshnessNote is required'),
    publicationStatus: z.enum(['draft', 'approved']).default('draft'),
  })
  .superRefine((data, ctx) => {
    // 1. Validate allowed 7 lens/format combinations
    const isValidCombo = VALID_LENS_FORMAT_COMBINATIONS.some(
      ([lens, fmt]) => data.reportLens === lens && data.reportFormat === fmt
    );

    if (!isValidCombo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reportFormat'],
        message: `Invalid lens/format combination: '${data.reportLens}' with '${data.reportFormat}'. Allowed combinations: UX (full-market, brand-comparison, change-detection), 360 (full-market, brand-comparison), Combined (full-market, brand-comparison).`,
      });
    }

    // 2. Validate productRefs
    if (data.reportLens === 'jurnii-ux') {
      if (data.productRefs.length !== 1 || data.productRefs[0] !== 'jurnii-ux') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productRefs'],
          message: `Product lens 'jurnii-ux' must have productRefs strictly equal to ['jurnii-ux']. Found: [${data.productRefs.join(', ')}].`,
        });
      }
    } else if (data.reportLens === 'jurnii-360') {
      if (data.productRefs.length !== 1 || data.productRefs[0] !== 'jurnii-360') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productRefs'],
          message: `Product lens 'jurnii-360' must have productRefs strictly equal to ['jurnii-360']. Found: [${data.productRefs.join(', ')}].`,
        });
      }
    } else if (data.reportLens === 'combined') {
      const hasUx = data.productRefs.includes('jurnii-ux');
      const has360 = data.productRefs.includes('jurnii-360');
      if (!hasUx || !has360 || data.productRefs.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productRefs'],
          message: `Product lens 'combined' must have productRefs containing exactly ['jurnii-ux', 'jurnii-360']. Found: [${data.productRefs.join(', ')}].`,
        });
      }
    }

    // 3. Validate format cardinality
    if (data.reportFormat === 'full-market') {
      if (data.cohort.markets.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cohort', 'markets'],
          message: `full-market format requires exactly 1 market. Found: ${data.cohort.markets.length}.`,
        });
      }
      if (data.cohort.comparisonUnits.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cohort', 'comparisonUnits'],
          message: `full-market format requires at least 3 distinct comparison units. Found: ${data.cohort.comparisonUnits.length}.`,
        });
      }
    } else if (data.reportFormat === 'brand-comparison') {
      if (data.cohort.comparisonUnits.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cohort', 'comparisonUnits'],
          message: `brand-comparison format requires exactly 2 distinct comparison units. Found: ${data.cohort.comparisonUnits.length}.`,
        });
      } else {
        const [u1, u2] = data.cohort.comparisonUnits;
        if (u1.brand === u2.brand && u1.market === u2.market) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['cohort', 'comparisonUnits'],
            message: `Comparison units in brand-comparison must differ by brand, market, or both. Both units are identical: ${u1.brand} (${u1.market}).`,
          });
        }
      }
    } else if (data.reportFormat === 'change-detection') {
      if (data.reportLens !== 'jurnii-ux') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reportFormat'],
          message: `change-detection format is valid only under 'jurnii-ux'.`,
        });
      }
      if (data.cohort.comparisonUnits.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cohort', 'comparisonUnits'],
          message: `change-detection format requires at least 1 named comparison unit.`,
        });
      }
      if (data.comparisonMode !== 'delta' && data.comparisonMode !== 'before-after') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['comparisonMode'],
          message: `change-detection requires comparisonMode 'delta' or 'before-after'. Found: '${data.comparisonMode}'.`,
        });
      }
    }
  });

// Schema for Evidence Manifest (evidence-manifest.json)
export const EvidenceSourceSchema = z.object({
  id: z.string(),
  system: z.string(),
  product: z.enum(['jurnii-ux', 'jurnii-360']),
  reportTitle: z.string(),
  stableIdentifier: z.string(),
  comparisonUnit: ComparisonUnitSchema,
  market: z.string(),
  attributes: z.record(z.any()).optional(),
  reportDate: z.string(),
  analysisPeriod: AnalysisPeriodSchema,
  lastUpdatedDate: z.string().optional(),
  captureTimestamp: z.string(),
  locator: z.string(),
  isBackfill: z.boolean().optional(),
  metrics: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string().optional(),
      dimension: z.string().optional(),
      location: z.string().optional(),
    })
  ).optional(),
});

export const EvidenceCalculationSchema = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string(),
  inputs: z.array(z.string()),
  output: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
});

export const EvidenceImageSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  path: z.string(),
  caption: z.string(),
  alt: z.string(),
  period: z.string(),
  transformations: z.string().optional(),
  approvalState: z.enum(['draft', 'approved']),
  isPublicSafe: z.boolean(),
});

export const EvidenceClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  sourceIds: z.array(z.string()).min(1),
  calculationIds: z.array(z.string()).optional(),
  productProvenance: z.enum(['jurnii-ux', 'jurnii-360']),
  confidence: z.enum(['high', 'medium', 'low']),
  limitations: z.string().optional(),
});

export const EvidenceManifestSchema = z.object({
  manifestVersion: z.string(),
  reportSlug: z.string(),
  reportLens: z.enum(['jurnii-ux', 'jurnii-360', 'combined']),
  reportFormat: z.enum(['full-market', 'brand-comparison', 'change-detection']),
  sources: z.array(EvidenceSourceSchema).min(1),
  calculations: z.array(EvidenceCalculationSchema).optional().default([]),
  images: z.array(EvidenceImageSchema).optional().default([]),
  claims: z.array(EvidenceClaimSchema).min(1),
  limitationsSummary: z.string().optional(),
  approvalState: z.enum(['draft', 'approved']).default('draft'),
});

// Schema for Social Content Package (social-package.json)
export const SocialAssetRefSchema = z.object({
  assetId: z.string(),
  caption: z.string(),
  alt: z.string(),
  order: z.number().default(1),
});

export const SocialPostSchema = z.object({
  id: z.string(),
  channel: z.literal('linkedin'),
  postType: z.enum(['flagship', 'focused', 'additional']),
  angle: z.string(),
  targetAudience: z.string(),
  asOfDate: z.string(),
  body: z.string().min(50, 'Social post body must be substantive'),
  claimIds: z.array(z.string()).min(1, 'Post must link to at least 1 claim ID'),
  assets: z.array(SocialAssetRefSchema).optional().default([]),
  cta: z.object({
    text: z.string(),
    destination: z.string(),
  }),
  status: z.enum(['draft', 'approved', 'published']).default('draft'),
  publishedUrl: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const SocialPackageSchema = z.object({
  packageVersion: z.string(),
  reportSlug: z.string(),
  reportTitle: z.string(),
  reportLens: z.enum(['jurnii-ux', 'jurnii-360', 'combined']),
  reportFormat: z.enum(['full-market', 'brand-comparison', 'change-detection']),
  posts: z.array(SocialPostSchema).min(2, 'Social package must contain at least 2 distinct posts'),
});

export type MarketReport = z.infer<typeof MarketReportSchema>;
export type EvidenceManifest = z.infer<typeof EvidenceManifestSchema>;
export type SocialPackage = z.infer<typeof SocialPackageSchema>;
export type SocialPost = z.infer<typeof SocialPostSchema>;
