import { z } from 'zod';

export const participationReportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  departmentId: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json').optional(),
});

export type ParticipationReportQueryInput = z.infer<typeof participationReportQuerySchema>;
