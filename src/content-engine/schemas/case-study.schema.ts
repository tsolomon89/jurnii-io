import { z } from 'zod';

export const CaseStudySchema = z.object({
  client: z.string(),
  title: z.string(),
  summary: z.string(),
  outcome: z.string(),
  services: z.array(z.string()),
  date: z.string(),
});

export type CaseStudy = z.infer<typeof CaseStudySchema>;
