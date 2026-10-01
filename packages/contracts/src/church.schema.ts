import { z } from 'zod';

export const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;

export const updateChurchSettingsSchema = z.object({
  churchId: z.string().optional(),
  name: z.string().trim().min(3, 'Nome da igreja deve ter no mínimo 3 caracteres').max(100),
  logoUrl: z.string().url('URL inválida').optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex, 'Cor primária deve estar no formato #RRGGBB'),
  secondaryColor: z.string().regex(hexColorRegex, 'Cor secundária deve estar no formato #RRGGBB'),
  phone: z.string().trim().optional().nullable(),
});

export type UpdateChurchSettingsInput = z.infer<typeof updateChurchSettingsSchema>;

export const createChurchSchema = z.object({
  name: z.string().trim().min(3, 'Nome da igreja deve ter no mínimo 3 caracteres').max(100),
  slug: z.string().trim().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  logoUrl: z.string().url('URL inválida').optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex, 'Cor primária deve estar no formato #RRGGBB').default('#1E40AF'),
  secondaryColor: z.string().regex(hexColorRegex, 'Cor secundária deve estar no formato #RRGGBB').default('#F59E0B'),
  phone: z.string().trim().optional().nullable(),
});

export type CreateChurchInput = z.infer<typeof createChurchSchema>;

export const assignElderSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  churchId: z.string().min(1, 'ID da igreja é obrigatório'),
});

export type AssignElderInput = z.infer<typeof assignElderSchema>;

export const switchActiveChurchSchema = z.object({
  churchId: z.string().min(1, 'ID da igreja é obrigatório'),
});

export type SwitchActiveChurchInput = z.infer<typeof switchActiveChurchSchema>;
