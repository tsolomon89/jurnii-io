import { z } from 'zod';

export const BaseEntitySchema = z.object({
  title: z.string({ required_error: 'title is required' }),
  description: z.string({ required_error: 'description is required' }),
  category: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().default(99),
  excerpt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  heroFeatures: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  deepWorkFeatures: z
    .array(
      z.object({
        icon: z.string(),
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  pullQuote: z.string().optional(),
  pullQuoteAttribution: z.string().optional(),
  
  // Legacy Jurnii Product Data Extensions
  outcomes: z.object({
    heading: z.string(),
    sub: z.string().optional(),
    kpis: z.array(z.object({
      num: z.string(),
      label: z.string(),
      desc: z.string()
    }))
  }).optional(),
  
  method: z.object({
    heading: z.string(),
    sub: z.string().optional(),
    steps: z.array(z.object({
      title: z.string(),
      body: z.string()
    }))
  }).optional(),
  
  testimonials: z.object({
    eyebrow: z.string().optional(),
    heading: z.string(),
    items: z.array(z.object({
      quote: z.string(),
      author: z.string(),
      role: z.string(),
      initials: z.string().optional(),
      color: z.string().optional(),
      avatar: z.string().optional()
    }))
  }).optional(),
  
  personas: z.object({
    heading: z.string(),
    sub: z.string().optional(),
    list: z.array(z.object({
      role: z.string(),
      question: z.string(),
      answer: z.string()
    }))
  }).optional(),
  
  cta: z.object({
    heading: z.string(),
    sub: z.string().optional(),
    primary: z.object({ label: z.string(), href: z.string() }).optional(),
    secondary: z.object({ label: z.string(), href: z.string() }).optional()
  }).optional(),
  
  renderFlags: z.object({
    hasPriceBoostTeaser: z.boolean().optional(),
    hasPromotionsByVertical: z.boolean().optional(),
    hasUXScorecard: z.boolean().optional(),
    hasUXTelemetry: z.boolean().optional(),
    hasCanvasComments: z.boolean().optional(),
    hasMMMTeaser: z.boolean().optional()
  }).optional(),
});

export const ProductEntitySchema = BaseEntitySchema.extend({
  featureRefs: z.array(z.string()).default([]),
  solutionRefs: z.array(z.string()).default([]),
  useCaseValueRefs: z.array(z.string()).default([]),
});

export const FeatureEntitySchema = BaseEntitySchema.extend({
  productRefs: z.array(z.string()).default([]),
  solutionRefs: z.array(z.string()).default([]),
  useCaseValueRefs: z.array(z.string()).default([]),
});

export const SolutionEntitySchema = BaseEntitySchema.extend({
  productRefs: z.array(z.string()).default([]),
  featureRefs: z.array(z.string()).default([]),
  useCaseValueRefs: z.array(z.string()).default([]),
});

export const UseCaseEntitySchema = BaseEntitySchema.extend({
  productRefs: z.array(z.string()).default([]),
  featureRefs: z.array(z.string()).default([]),
  solutionRefs: z.array(z.string()).default([]),
});
