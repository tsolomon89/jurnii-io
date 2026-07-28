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
