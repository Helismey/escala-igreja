import { z } from 'zod';
import { addressSchema, emergencyContactSchema, phoneRegex } from './auth.schema.js';

export const updateMemberSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).optional().nullable(),
  maritalStatus: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'OUTRO']).optional().nullable(),
  phonePrimary: z.string().trim().regex(phoneRegex).optional(),
  phoneSecondary: z.string().trim().regex(phoneRegex).optional().nullable(),
  whatsapp: z.string().trim().regex(phoneRegex).optional().nullable(),
  address: addressSchema.optional().nullable(),
  emergencyContact: emergencyContactSchema.optional().nullable(),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferredChannel: z.enum(['WHATSAPP', 'EMAIL', 'PUSH', 'SMS']).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const approveMemberSchema = z.object({
  userId: z.string().min(1, 'ID do usuário obrigatório'),
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  functionIds: z.array(z.string()).default([]),
});

export type ApproveMemberInput = z.infer<typeof approveMemberSchema>;

export const rejectMemberSchema = z.object({
  userId: z.string().min(1, 'ID do usuário obrigatório'),
  reason: z.string().max(200).optional(),
});

export type RejectMemberInput = z.infer<typeof rejectMemberSchema>;
