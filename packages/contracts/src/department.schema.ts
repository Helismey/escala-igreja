import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Nome do departamento deve ter no mínimo 2 caracteres').max(60),
  churchId: z.string().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const createFunctionSchema = z.object({
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  name: z.string().trim().min(2, 'Nome da função deve ter no mínimo 2 caracteres').max(60),
});

export type CreateFunctionInput = z.infer<typeof createFunctionSchema>;

export const assignManagerSchema = z.object({
  departmentId: z.string().min(1),
  userId: z.string().min(1),
});

export type AssignManagerInput = z.infer<typeof assignManagerSchema>;

export const addDepartmentMemberSchema = z.object({
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  userId: z.string().min(1, 'Voluntário obrigatório'),
  role: z.enum(['MANAGER', 'MEMBER']).default('MEMBER'),
  functionIds: z.array(z.string()).default([]),
});

export type AddDepartmentMemberInput = z.infer<typeof addDepartmentMemberSchema>;

export const updateDepartmentMemberSchema = z.object({
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  userId: z.string().min(1, 'Voluntário obrigatório'),
  role: z.enum(['MANAGER', 'MEMBER']).optional(),
  functionIds: z.array(z.string()).default([]),
});

export type UpdateDepartmentMemberInput = z.infer<typeof updateDepartmentMemberSchema>;

export const removeDepartmentMemberSchema = z.object({
  departmentId: z.string().min(1, 'Departamento obrigatório'),
  userId: z.string().min(1, 'Voluntário obrigatório'),
});

export type RemoveDepartmentMemberInput = z.infer<typeof removeDepartmentMemberSchema>;

