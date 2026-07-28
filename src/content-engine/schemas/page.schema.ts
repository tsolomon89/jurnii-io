import { z } from 'zod';

export const PageSchema = z.object({
  title: z.string({ required_error: 'Page title is required' }),
  description: z.string().optional(),
  template: z.string().optional(),
  slug: z.string().optional(),
  seo: z.record(z.any()).optional(),
  sections: z.array(z.any()).optional(),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  isIndexable: z.boolean().default(true),
});

export type Page = z.infer<typeof PageSchema>;
