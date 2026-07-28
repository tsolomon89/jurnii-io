import { z } from 'zod';

export const ProjectSchema = z.object({
  description: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  tagline: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  year: z.number().optional(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  url: z.string().optional(),
  link: z.string().optional(),
  featured: z.boolean().default(false),
});

export type Project = z.infer<typeof ProjectSchema>;
