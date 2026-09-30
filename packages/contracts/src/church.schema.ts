import { z } from 'zod';

export const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;

export const updateChurchSettingsSchema = z.object({
  name: z.string().trim().min(3, 'Nome da igreja deve ter no mínimo 3 caracteres').max(100),
  logoUrl: z.string().url('URL inválida').optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex, 'Cor primária deve estar no formato #RRGGBB'),
  secondaryColor: z.string().regex(hexColorRegex, 'Cor secundária deve estar no formato #RRGGBB'),
});

export type UpdateChurchSettingsInput = z.infer<typeof updateChurchSettingsSchema>;
