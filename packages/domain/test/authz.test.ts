import { describe, expect, it } from 'vitest';
import {
  can,
  UserContext,
  maskPhoneNumber,
  maskEmail,
  sanitizeMemberForVolunteers,
  RawMemberData,
} from '../src/index.js';

describe('Autorização RBAC (can) e Escopo Departamental', () => {
  const adminMaster: UserContext = {
    id: 'admin-1',
    globalRole: 'ADMIN_MASTER',
    status: 'ACTIVE',
    departmentMemberships: [],
  };

  const gestorLouvor: UserContext = {
    id: 'gestor-louvor',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [
      { departmentId: 'dept-louvor', role: 'MANAGER' },
      { departmentId: 'dept-midia', role: 'MEMBER' },
    ],
  };

  const membroComum: UserContext = {
    id: 'membro-1',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [
      { departmentId: 'dept-louvor', role: 'MEMBER' },
    ],
  };

  const usuarioPendente: UserContext = {
    id: 'pendente-1',
    globalRole: 'USER',
    status: 'PENDING',
    departmentMemberships: [],
  };

  it('ADMIN_MASTER possui permissão irrestrita nas ações administrativas', () => {
    expect(can(adminMaster, 'church:settings:update')).toBe(true);
    expect(can(adminMaster, 'audit:view')).toBe(true);
    expect(can(adminMaster, 'department:create')).toBe(true);
    expect(can(adminMaster, 'manager:assign')).toBe(true);
    expect(can(adminMaster, 'assignment:create', { departmentId: 'dept-louvor' })).toBe(true);
  });

  it('impede que o ADMIN_MASTER rebaixe a si próprio para USER (regra de segurança)', () => {
    expect(
      can(adminMaster, 'profile:update:other', {
        targetUserId: adminMaster.id,
        newRole: 'USER',
      })
    ).toBe(false);
  });

  it('GESTOR pode gerenciar apenas o departamento onde é gestor', () => {
    // No seu departamento: permitido
    expect(can(gestorLouvor, 'assignment:create', { departmentId: 'dept-louvor' })).toBe(true);
    expect(can(gestorLouvor, 'registration:approve', { departmentId: 'dept-louvor' })).toBe(true);
    expect(can(gestorLouvor, 'function:create', { departmentId: 'dept-louvor' })).toBe(true);

    // Em outro departamento: negado (proteção contra IDOR)
    expect(can(gestorLouvor, 'assignment:create', { departmentId: 'dept-midia' })).toBe(false);
    expect(can(gestorLouvor, 'assignment:create', { departmentId: 'dept-infantil' })).toBe(false);
    expect(can(gestorLouvor, 'registration:approve', { departmentId: 'dept-midia' })).toBe(false);

    // Ações exclusivas de ADMIN_MASTER: negado para gestor
    expect(can(gestorLouvor, 'church:settings:update')).toBe(false);
    expect(can(gestorLouvor, 'audit:view')).toBe(false);
    expect(can(gestorLouvor, 'department:create')).toBe(false);
  });

  it('MEMBRO só tem acesso ao próprio espaço e visualização permitida', () => {
    // Pode ver e interagir com sua própria escala
    expect(can(membroComum, 'assignment:view:own', { targetUserId: membroComum.id })).toBe(true);
    expect(can(membroComum, 'assignment:confirm:own', { targetUserId: membroComum.id })).toBe(true);
    expect(can(membroComum, 'assignment:decline:own', { targetUserId: membroComum.id })).toBe(true);
    expect(can(membroComum, 'profile:view:own', { targetUserId: membroComum.id })).toBe(true);

    // Não pode criar ou alterar escalas
    expect(can(membroComum, 'assignment:create', { departmentId: 'dept-louvor' })).toBe(false);
    expect(can(membroComum, 'department:create')).toBe(false);
    expect(can(membroComum, 'registration:approve')).toBe(false);

    // Não pode ver dados completos de outro membro
    expect(can(membroComum, 'profile:view:other', { targetUserId: 'outro-user', departmentId: 'dept-louvor' })).toBe(false);
  });

  it('PENDENTE, REJEITADO ou INATIVO tem acesso NEGADO a todas as ações', () => {
    expect(can(usuarioPendente, 'profile:view:own')).toBe(false);
    expect(can(usuarioPendente, 'assignment:view:own')).toBe(false);
    expect(can(usuarioPendente, 'department:view')).toBe(false);
    expect(can(usuarioPendente, 'program:view')).toBe(false);
  });
});

describe('Sanitização e Mascaramento de Dados Pessoais (LGPD)', () => {
  it('mascara número de telefone ocultando dígitos centrais', () => {
    expect(maskPhoneNumber('+5562987654321')).toBe('+55629****-4321');
    expect(maskPhoneNumber('')).toBe('');
  });

  it('mascara e-mail preservando início e domínio', () => {
    expect(maskEmail('voluntario@igreja.org.br')).toBe('v***o@igreja.org.br');
    expect(maskEmail('')).toBe('');
  });

  it('sanitiza membro para voluntários da equipe removendo telefone, endereço e emergência', () => {
    const raw: RawMemberData = {
      id: 'usr-1',
      name: 'Maria Souza',
      email: 'maria@example.com',
      phonePrimary: '+5562988887777',
      address: { street: 'Rua das Flores', number: '123' },
      emergencyContact: { name: 'José', phone: '+5562999998888' },
      departmentMemberships: [
        {
          departmentId: 'dept-1',
          departmentName: 'Recepção',
          role: 'MEMBER',
          functions: [{ functionId: 'f-1', functionName: 'Porta' }],
        },
      ],
    };

    const sanitized = sanitizeMemberForVolunteers(raw);
    expect(sanitized.id).toBe('usr-1');
    expect(sanitized.name).toBe('Maria Souza');
    expect((sanitized as unknown as RawMemberData).phonePrimary).toBeUndefined();
    expect((sanitized as unknown as RawMemberData).email).toBeUndefined();
    expect((sanitized as unknown as RawMemberData).address).toBeUndefined();
    expect((sanitized as unknown as RawMemberData).emergencyContact).toBeUndefined();
  });
});
