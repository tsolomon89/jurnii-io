import { z } from 'zod';

export const ServiceSchema = z.object({
  title: z.string(),
  description: z.string(),
  features: z.array(z.string()).default([]),
  icon: z.string().optional(),
  featured: z.boolean().default(false),
  order: z.number().default(99),
});

export type Service = z.infer<typeof ServiceSchema>;
