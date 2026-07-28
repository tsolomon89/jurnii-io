import { z } from 'zod';

export const PostSchema = z.object({
  title: z.string({ required_error: 'Post title is required' }),
  excerpt: z.string().optional(),
  date: z.string({ required_error: 'Post date is required' }),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  readTime: z.string().optional(),
  coverImage: z.string().optional(),
  medium: z.string().optional(),
  subtitle: z.string().optional(),
  productRefs: z.array(z.string()).default([]),
  featureRefs: z.array(z.string()).default([]),
  solutionRefs: z.array(z.string()).default([]),
  useCaseValueRefs: z.array(z.string()).default([]),
  useCaseFieldRefs: z.array(z.string()).default([]),
  isIndexable: z.boolean().default(true),
});

export type Post = z.infer<typeof PostSchema>;
