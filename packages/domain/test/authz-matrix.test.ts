import { describe, expect, it } from 'vitest';
import { can, UserContext, Action, ResourceContext } from '../src/index.js';

describe('Matriz Completa de Autorização (docs/testing/matriz-autorizacao.md)', () => {
  // Perfis representativos
  const admUser: UserContext = {
    id: 'user-adm',
    globalRole: 'ADMIN_MASTER',
    status: 'ACTIVE',
    departmentMemberships: [],
  };

  const gesAUser: UserContext = {
    id: 'user-ges-a',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [{ departmentId: 'dept-a', role: 'MANAGER' }],
  };

  const gesBUser: UserContext = {
    id: 'user-ges-b',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [{ departmentId: 'dept-b', role: 'MANAGER' }],
  };

  const memUser: UserContext = {
    id: 'user-mem',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [{ departmentId: 'dept-a', role: 'MEMBER' }],
  };

  const penUser: UserContext = {
    id: 'user-pen',
    globalRole: 'USER',
    status: 'PENDING',
    departmentMemberships: [{ departmentId: 'dept-a', role: 'MEMBER' }],
  };

  const inaUser: UserContext = {
    id: 'user-ina',
    globalRole: 'USER',
    status: 'INACTIVE',
    departmentMemberships: [{ departmentId: 'dept-a', role: 'MEMBER' }],
  };

  const anoUser: UserContext | null = null;

  describe('1. Usuários Pendentes, Inativos ou Anônimos (Negar Tudo)', () => {
    const allActions: Action[] = [
      'profile:view:own',
      'profile:update:own',
      'profile:view:other',
      'profile:update:other',
      'profile:export:own',
      'registration:approve',
      'registration:reject',
      'member:create',
      'member:import',
      'member:export',
      'department:create',
      'department:update',
      'department:view',
      'department:member:add',
      'department:member:update',
      'department:member:remove',
      'function:create',
      'function:update',
      'manager:assign',
      'program:create',
      'program:update',
      'program:delete',
      'program:clone',
      'program:view',
      'assignment:create',
      'assignment:delete',
      'assignment:confirm:own',
      'assignment:decline:own',
      'assignment:view:all',
      'assignment:view:department',
      'assignment:view:own',
      'availability:manage:own',
      'church:settings:update',
      'audit:view',
    ];

    it.each(allActions)('bloqueia ação %s para anônimo, pendente e inativo', (action) => {
      expect(can(anoUser, action)).toBe(false);
      expect(can(penUser, action)).toBe(false);
      expect(can(inaUser, action)).toBe(false);
    });
  });

  describe('2. Ações exclusivas de ADMIN_MASTER', () => {
    const adminOnly: Action[] = [
      'department:create',
      'manager:assign',
      'church:settings:update',
      'audit:view',
      'assignment:view:all',
      'member:import',
      'member:export',
    ];

    it.each(adminOnly)('permite ação %s para ADM e bloqueia para Gestores e Membros', (action) => {
      expect(can(admUser, action)).toBe(true);
      expect(can(gesAUser, action)).toBe(false);
      expect(can(gesBUser, action)).toBe(false);
      expect(can(memUser, action)).toBe(false);
    });
  });

  describe('3. Escopo Departamental: Gestor A vs Gestor B vs Membro', () => {
    const deptActions: Action[] = [
      'department:update',
      'department:member:add',
      'department:member:update',
      'department:member:remove',
      'member:create',
      'function:create',
      'function:update',
      'assignment:create',
      'assignment:delete',
      'assignment:view:department',
      'registration:approve',
      'registration:reject',
      'program:create',
      'program:update',
      'program:clone',
    ];

    it.each(deptActions)('ação %s em dept-a: permitida para ADM e GES-A, negada para GES-B e MEM', (action) => {
      const scopeInA: ResourceContext = { departmentId: 'dept-a' };

      // ADM pode tudo
      expect(can(admUser, action, scopeInA)).toBe(true);

      // GES-A é gestor de dept-a: PERMITIDO
      expect(can(gesAUser, action, scopeInA)).toBe(true);

      // GES-B é gestor de dept-b (IDOR prevention): NEGADO
      expect(can(gesBUser, action, scopeInA)).toBe(false);

      // MEM é apenas membro comum: NEGADO
      expect(can(memUser, action, scopeInA)).toBe(false);
    });
  });

  describe('4. Ações Próprias do Voluntário (Meu Espaço)', () => {
    const ownActions: Action[] = [
      'profile:view:own',
      'profile:update:own',
      'profile:export:own',
      'availability:manage:own',
      'assignment:confirm:own',
      'assignment:decline:own',
      'assignment:view:own',
    ];

    it.each(ownActions)('permite que qualquer usuário ativo acesse o próprio recurso', (action) => {
      expect(can(admUser, action, { targetUserId: admUser.id })).toBe(true);
      expect(can(gesAUser, action, { targetUserId: gesAUser.id })).toBe(true);
      expect(can(memUser, action, { targetUserId: memUser.id })).toBe(true);
    });

    it.each(ownActions)('impede que o membro acesse ação própria visando outro usuário (IDOR)', (action) => {
      expect(can(memUser, action, { targetUserId: 'outro-user' })).toBe(false);
    });
  });

  describe('5. Travas Especiais de Segurança e Integridade', () => {
    it('impede que o próprio ADMIN_MASTER se auto-rebaixe para USER (proteção do último admin)', () => {
      const selfDemote: ResourceContext = {
        targetUserId: admUser.id,
        newRole: 'USER',
      };
      expect(can(admUser, 'profile:update:other', selfDemote)).toBe(false);
    });

    it('impede que gestores promovam qualquer pessoa para ADMIN_MASTER', () => {
      const promoteToAdmin: ResourceContext = {
        departmentId: 'dept-a',
        targetUserId: 'user-alvo',
        newRole: 'ADMIN_MASTER',
      };
      expect(can(gesAUser, 'profile:update:other', promoteToAdmin)).toBe(false);
    });

    it('permite que membros visualizem a lista geral de departamentos e programas', () => {
      expect(can(memUser, 'department:view')).toBe(true);
      expect(can(memUser, 'program:view')).toBe(true);
    });
  });
});
