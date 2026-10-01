import { describe, expect, it } from 'vitest';
import {
  can,
  canModifyResourceByHierarchy,
  ROLE_HIERARCHY_LEVEL,
  GlobalRole,
  UserContext,
  getAuthorizedMenuItems,
  getMobileNavigation,
} from '../src/index.js';

describe('Fase 2: Domínio e Hierarquia de Acesso Eclesiástico', () => {
  describe('ROLE_HIERARCHY_LEVEL: Níveis Numéricos Estritos', () => {
    it('garante que ADMIN_MASTER > PASTOR > ELDER > USER', () => {
      expect(ROLE_HIERARCHY_LEVEL['ADMIN_MASTER']).toBe(4);
      expect(ROLE_HIERARCHY_LEVEL['PASTOR']).toBe(3);
      expect(ROLE_HIERARCHY_LEVEL['ELDER']).toBe(2);
      expect(ROLE_HIERARCHY_LEVEL['USER']).toBe(1);

      expect(ROLE_HIERARCHY_LEVEL['ADMIN_MASTER']).toBeGreaterThan(ROLE_HIERARCHY_LEVEL['PASTOR']);
      expect(ROLE_HIERARCHY_LEVEL['PASTOR']).toBeGreaterThan(ROLE_HIERARCHY_LEVEL['ELDER']);
      expect(ROLE_HIERARCHY_LEVEL['ELDER']).toBeGreaterThan(ROLE_HIERARCHY_LEVEL['USER']);
    });
  });

  describe('canModifyResourceByHierarchy: Regra de Imutabilidade Superior', () => {
    const roles: GlobalRole[] = ['ADMIN_MASTER', 'PASTOR', 'ELDER', 'USER'];

    it('recurso sem criador definido (null/undefined) pode ser alterado por qualquer papel', () => {
      for (const role of roles) {
        expect(canModifyResourceByHierarchy(role, null)).toBe(true);
        expect(canModifyResourceByHierarchy(role, undefined)).toBe(true);
      }
    });

    it('ADMIN_MASTER (Nível 4) pode alterar/remover recursos criados por qualquer nível', () => {
      expect(canModifyResourceByHierarchy('ADMIN_MASTER', 'ADMIN_MASTER')).toBe(true);
      expect(canModifyResourceByHierarchy('ADMIN_MASTER', 'PASTOR')).toBe(true);
      expect(canModifyResourceByHierarchy('ADMIN_MASTER', 'ELDER')).toBe(true);
      expect(canModifyResourceByHierarchy('ADMIN_MASTER', 'USER')).toBe(true);
    });

    it('PASTOR (Nível 3) pode alterar recursos de PASTOR, ELDER e USER, mas NÃO de ADMIN_MASTER', () => {
      expect(canModifyResourceByHierarchy('PASTOR', 'ADMIN_MASTER')).toBe(false);
      expect(canModifyResourceByHierarchy('PASTOR', 'PASTOR')).toBe(true);
      expect(canModifyResourceByHierarchy('PASTOR', 'ELDER')).toBe(true);
      expect(canModifyResourceByHierarchy('PASTOR', 'USER')).toBe(true);
    });

    it('ANCIÃO / ELDER (Nível 2) pode alterar de ELDER e USER, mas NUNCA de PASTOR ou ADMIN_MASTER', () => {
      expect(canModifyResourceByHierarchy('ELDER', 'ADMIN_MASTER')).toBe(false);
      expect(canModifyResourceByHierarchy('ELDER', 'PASTOR')).toBe(false);
      expect(canModifyResourceByHierarchy('ELDER', 'ELDER')).toBe(true);
      expect(canModifyResourceByHierarchy('ELDER', 'USER')).toBe(true);
    });

    it('USER (Nível 1) só pode alterar recursos de USER', () => {
      expect(canModifyResourceByHierarchy('USER', 'ADMIN_MASTER')).toBe(false);
      expect(canModifyResourceByHierarchy('USER', 'PASTOR')).toBe(false);
      expect(canModifyResourceByHierarchy('USER', 'ELDER')).toBe(false);
      expect(canModifyResourceByHierarchy('USER', 'USER')).toBe(true);
    });
  });

  describe('can(): Matriz de Autorização e Isolamento Anti-IDOR', () => {
    const admin: UserContext = {
      id: 'admin-1',
      globalRole: 'ADMIN_MASTER',
      status: 'ACTIVE',
      departmentMemberships: [],
    };

    const pastorRegional: UserContext = {
      id: 'pastor-1',
      globalRole: 'PASTOR',
      status: 'ACTIVE',
      pastorChurchIds: ['igreja-sede', 'igreja-filial-1'],
      departmentMemberships: [],
    };

    const anciaoSede: UserContext = {
      id: 'anciao-sede',
      globalRole: 'ELDER',
      status: 'ACTIVE',
      churchId: 'igreja-sede',
      departmentMemberships: [],
    };

    const anciaoFilial: UserContext = {
      id: 'anciao-filial',
      globalRole: 'ELDER',
      status: 'ACTIVE',
      churchId: 'igreja-filial-1',
      departmentMemberships: [],
    };

    const voluntarioSede: UserContext = {
      id: 'voluntario-sede',
      globalRole: 'USER',
      status: 'ACTIVE',
      churchId: 'igreja-sede',
      departmentMemberships: [{ departmentId: 'dept-louvor', role: 'MEMBER' }],
    };

    describe('Regras Técnicas do Sistema (system:technical:manage e audit:view)', () => {
      it('ADMIN_MASTER possui permissão exclusiva para gerenciar regras técnicas e infra', () => {
        expect(can(admin, 'system:technical:manage')).toBe(true);
        expect(can(admin, 'audit:view')).toBe(true);
      });

      it('PASTOR NÃO tem acesso a regras técnicas de sistema nem auditoria técnica', () => {
        expect(can(pastorRegional, 'system:technical:manage')).toBe(false);
        expect(can(pastorRegional, 'audit:view')).toBe(false);
      });

      it('ANCIÃO NÃO tem acesso a regras técnicas de sistema nem auditoria técnica', () => {
        expect(can(anciaoSede, 'system:technical:manage')).toBe(false);
        expect(can(anciaoSede, 'audit:view')).toBe(false);
      });

      it('VOLUNTÁRIO NÃO tem acesso a regras técnicas de sistema', () => {
        expect(can(voluntarioSede, 'system:technical:manage')).toBe(false);
        expect(can(voluntarioSede, 'audit:view')).toBe(false);
      });
    });

    describe('Vinculação de Anciãos (church:elder:assign)', () => {
      it('ADMIN_MASTER pode vincular Ancião a qualquer congregação', () => {
        expect(can(admin, 'church:elder:assign', { churchId: 'igreja-sede' })).toBe(true);
        expect(can(admin, 'church:elder:assign', { churchId: 'igreja-qualquer' })).toBe(true);
      });

      it('PASTOR pode vincular Ancião APENAS às congregações sob seus cuidados', () => {
        expect(can(pastorRegional, 'church:elder:assign', { churchId: 'igreja-sede' })).toBe(true);
        expect(can(pastorRegional, 'church:elder:assign', { churchId: 'igreja-filial-1' })).toBe(true);
        // Tentativa de vincular em congregação fora do seu pastoreio (Anti-IDOR)
        expect(can(pastorRegional, 'church:elder:assign', { churchId: 'igreja-outra-regiao' })).toBe(false);
      });

      it('ANCIÃO e VOLUNTÁRIO NUNCA podem vincular anciãos', () => {
        expect(can(anciaoSede, 'church:elder:assign', { churchId: 'igreja-sede' })).toBe(false);
        expect(can(voluntarioSede, 'church:elder:assign', { churchId: 'igreja-sede' })).toBe(false);
      });
    });

    describe('Alternância de Congregação Ativa (church:switch)', () => {
      it('ADMIN_MASTER e PASTOR podem alternar a congregação ativa', () => {
        expect(can(admin, 'church:switch')).toBe(true);
        expect(can(pastorRegional, 'church:switch')).toBe(true);
      });

      it('ANCIÃO e VOLUNTÁRIO NÃO podem alternar congregação (estritamente 1 igreja única)', () => {
        expect(can(anciaoSede, 'church:switch')).toBe(false);
        expect(can(anciaoFilial, 'church:switch')).toBe(false);
        expect(can(voluntarioSede, 'church:switch')).toBe(false);
      });
    });

    describe('Criação e Gestão de Cronogramas com Proteção Hierárquica', () => {
      it('ANCIÃO pode criar programas na sua congregação, mas não em congregações alheias', () => {
        expect(can(anciaoSede, 'program:create', { churchId: 'igreja-sede' })).toBe(true);
        expect(can(anciaoSede, 'program:create', { churchId: 'igreja-filial-1' })).toBe(false);
      });

      it('ANCIÃO não pode alterar nem excluir programas criados pela Pastoral ou Admin', () => {
        // Programa criado pela Pastoral
        expect(
          can(anciaoSede, 'program:update', {
            churchId: 'igreja-sede',
            createdByRole: 'PASTOR',
          })
        ).toBe(false);
        expect(
          can(anciaoSede, 'program:delete', {
            churchId: 'igreja-sede',
            createdByRole: 'PASTOR',
          })
        ).toBe(false);

        // Programa criado pelo Admin Master
        expect(
          can(anciaoSede, 'program:update', {
            churchId: 'igreja-sede',
            createdByRole: 'ADMIN_MASTER',
          })
        ).toBe(false);
        expect(
          can(anciaoSede, 'program:delete', {
            churchId: 'igreja-sede',
            createdByRole: 'ADMIN_MASTER',
          })
        ).toBe(false);

        // Programa criado localmente pelo Ancião
        expect(
          can(anciaoSede, 'program:update', {
            churchId: 'igreja-sede',
            createdByRole: 'ELDER',
          })
        ).toBe(true);
        expect(
          can(anciaoSede, 'program:delete', {
            churchId: 'igreja-sede',
            createdByRole: 'ELDER',
          })
        ).toBe(true);
      });

      it('PASTOR pode alterar e excluir programas criados por Anciãos nas suas congregações', () => {
        expect(
          can(pastorRegional, 'program:update', {
            churchId: 'igreja-sede',
            createdByRole: 'ELDER',
          })
        ).toBe(true);
        expect(
          can(pastorRegional, 'program:delete', {
            churchId: 'igreja-sede',
            createdByRole: 'ELDER',
          })
        ).toBe(true);
      });
    });

    describe('Aprovação de Novos Cadastros', () => {
      it('ANCIÃO pode aprovar cadastros de novos voluntários da sua própria igreja', () => {
        expect(can(anciaoSede, 'registration:approve', { churchId: 'igreja-sede' })).toBe(true);
        expect(can(anciaoSede, 'registration:reject', { churchId: 'igreja-sede' })).toBe(true);
      });

      it('ANCIÃO é bloqueado de aprovar cadastros de congregações alheias (Anti-IDOR)', () => {
        expect(can(anciaoSede, 'registration:approve', { churchId: 'igreja-filial-1' })).toBe(false);
        expect(can(anciaoSede, 'registration:reject', { churchId: 'igreja-filial-1' })).toBe(false);
      });

      it('PASTOR pode aprovar cadastros de qualquer uma das suas igrejas pastoreadas', () => {
        expect(can(pastorRegional, 'registration:approve', { churchId: 'igreja-sede' })).toBe(true);
        expect(can(pastorRegional, 'registration:approve', { churchId: 'igreja-filial-1' })).toBe(true);
        expect(can(pastorRegional, 'registration:approve', { churchId: 'igreja-outra' })).toBe(false);
      });
    });

    describe('Atribuição Hierárquica de Cargos e Edição de Membros (ADR-017)', () => {
      const leaderMidia: UserContext = {
        id: 'leader-midia-1',
        globalRole: 'USER',
        status: 'ACTIVE',
        churchId: 'igreja-sede',
        departmentMemberships: [{ departmentId: 'dept-midia', role: 'MANAGER' }],
      };

      it('PASTOR pode nomear outro PASTOR, ELDER e USER nas congregações sob sua jurisdição', () => {
        expect(can(pastorRegional, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'PASTOR' })).toBe(true);
        expect(can(pastorRegional, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'ELDER' })).toBe(true);
        expect(can(pastorRegional, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'USER' })).toBe(true);
      });

      it('PASTOR NÃO pode promover para ADMIN_MASTER', () => {
        expect(can(pastorRegional, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'ADMIN_MASTER' })).toBe(false);
      });

      it('PASTOR é bloqueado de atribuir cargos fora de suas igrejas designadas (Anti-IDOR)', () => {
        expect(can(pastorRegional, 'profile:update:other', { churchId: 'igreja-outra', newRole: 'ELDER' })).toBe(false);
      });

      it('ANCIÃO (ELDER) só pode atribuir cargos para os níveis abaixo do seu (USER)', () => {
        expect(can(anciaoSede, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'USER' })).toBe(true);
      });

      it('ANCIÃO (ELDER) é bloqueado de nomear outro Ancião, Pastor ou Admin', () => {
        expect(can(anciaoSede, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'ELDER' })).toBe(false);
        expect(can(anciaoSede, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'PASTOR' })).toBe(false);
        expect(can(anciaoSede, 'profile:update:other', { churchId: 'igreja-sede', newRole: 'ADMIN_MASTER' })).toBe(false);
      });

      it('ADMIN_MASTER pode atribuir qualquer cargo no sistema', () => {
        expect(can(admin, 'profile:update:other', { newRole: 'ADMIN_MASTER' })).toBe(true);
        expect(can(admin, 'profile:update:other', { newRole: 'PASTOR' })).toBe(true);
        expect(can(admin, 'profile:update:other', { newRole: 'ELDER' })).toBe(true);
        expect(can(admin, 'profile:update:other', { newRole: 'USER' })).toBe(true);
      });

      it('LÍDER DE DEPARTAMENTO pode visualizar e atualizar membros de seu próprio departamento', () => {
        // Membro no departamento de mídia
        expect(can(leaderMidia, 'profile:view:other', { departmentIds: ['dept-midia'] })).toBe(true);
        expect(can(leaderMidia, 'profile:update:other', { departmentIds: ['dept-midia'] })).toBe(true);

        // Membro em outro departamento (louvor)
        expect(can(leaderMidia, 'profile:view:other', { departmentIds: ['dept-louvor'] })).toBe(false);
        expect(can(leaderMidia, 'profile:update:other', { departmentIds: ['dept-louvor'] })).toBe(false);
      });

      it('LÍDER DE DEPARTAMENTO NÃO pode alterar o cargo eclesiástico global de ninguém', () => {
        expect(can(leaderMidia, 'profile:update:other', { departmentIds: ['dept-midia'], newRole: 'ELDER' })).toBe(false);
        expect(can(leaderMidia, 'profile:update:other', { departmentIds: ['dept-midia'], newRole: 'PASTOR' })).toBe(false);
        expect(can(leaderMidia, 'profile:update:other', { departmentIds: ['dept-midia'], newRole: 'USER' })).toBe(false);
      });
    });
  });

  describe('Navegação e Menus Eclesiásticos (getAuthorizedMenuItems)', () => {
    it('ADMIN_MASTER visualiza todos os menus, incluindo Canais Técnicos e Auditoria', () => {
      const items = getAuthorizedMenuItems({
        id: 'admin-1',
        globalRole: 'ADMIN_MASTER',
        status: 'ACTIVE',
        departmentMemberships: [],
      });

      const paths = items.map((i) => i.href);
      expect(paths).toContain('/igrejas');
      expect(paths).toContain('/canais');
      expect(paths).toContain('/auditoria');
      expect(paths).toContain('/configuracoes');
      expect(paths).toContain('/programas');
      expect(paths).toContain('/membros');
    });

    it('PASTOR NÃO visualiza /canais (regras técnicas bloqueadas) e NÃO visualiza /auditoria de infra', () => {
      const items = getAuthorizedMenuItems({
        id: 'pastor-1',
        globalRole: 'PASTOR',
        status: 'ACTIVE',
        pastorChurchIds: ['igreja-1'],
        departmentMemberships: [],
      });

      const paths = items.map((i) => i.href);
      expect(paths).toContain('/igrejas');
      expect(paths).not.toContain('/canais');
      expect(paths).not.toContain('/auditoria');
      expect(paths).toContain('/configuracoes');
      expect(paths).toContain('/programas');
      expect(paths).toContain('/departamentos');
      expect(paths).toContain('/membros');
      expect(paths).toContain('/aprovacoes');
    });

    it('ANCIÃO visualiza gestão local (programas, membros, aprovações), mas NÃO /canais nem /configuracoes', () => {
      const items = getAuthorizedMenuItems({
        id: 'anciao-1',
        globalRole: 'ELDER',
        status: 'ACTIVE',
        churchId: 'igreja-1',
        departmentMemberships: [],
      });

      const paths = items.map((i) => i.href);
      expect(paths).not.toContain('/igrejas');
      expect(paths).not.toContain('/canais');
      expect(paths).not.toContain('/configuracoes');
      expect(paths).not.toContain('/auditoria');
      expect(paths).toContain('/programas');
      expect(paths).toContain('/departamentos');
      expect(paths).toContain('/membros');
      expect(paths).toContain('/aprovacoes');
    });

    it('VOLUNTÁRIO COMUM visualiza áreas pessoais e agenda de cultos, mas NÃO áreas restritas de gestão', () => {
      const items = getAuthorizedMenuItems({
        id: 'user-1',
        globalRole: 'USER',
        status: 'ACTIVE',
        churchId: 'igreja-1',
        departmentMemberships: [{ departmentId: 'dept-midia', role: 'MEMBER' }],
      });

      const paths = items.map((i) => i.href);
      expect(paths).not.toContain('/igrejas');
      expect(paths).not.toContain('/canais');
      expect(paths).not.toContain('/configuracoes');
      expect(paths).not.toContain('/aprovacoes');
      expect(paths).not.toContain('/auditoria');
      expect(paths).not.toContain('/slots-abertos');
      expect(paths).not.toContain('/historico'); // Histórico e relatórios é restrito à gestão
      expect(paths).toContain('/minha-escala');
      expect(paths).toContain('/disponibilidade');
      expect(paths).toContain('/trocas');
      expect(paths).toContain('/programas');
    });
  });

  describe('Navegação Mobile Inferior (getMobileNavigation)', () => {
    it('PASTOR recebe atalhos mobile com Início, Escalas e Membros na barra inferior', () => {
      const nav = getMobileNavigation({
        id: 'pastor-1',
        globalRole: 'PASTOR',
        status: 'ACTIVE',
        pastorChurchIds: ['igreja-1'],
        departmentMemberships: [],
      });

      const bottomPaths = nav.bottomBar.map((n) => n.href);
      expect(bottomPaths).toContain('/');
      expect(bottomPaths).toContain('/escalas');
      expect(bottomPaths).toContain('/membros');
    });

    it('ANCIÃO recebe atalhos mobile com Início, Escalas e Programas na barra inferior', () => {
      const nav = getMobileNavigation({
        id: 'anciao-1',
        globalRole: 'ELDER',
        status: 'ACTIVE',
        churchId: 'igreja-1',
        departmentMemberships: [],
      });

      const bottomPaths = nav.bottomBar.map((n) => n.href);
      expect(bottomPaths).toContain('/');
      expect(bottomPaths).toContain('/escalas');
      expect(bottomPaths).toContain('/programas');
    });

    it('VOLUNTÁRIO recebe atalhos mobile com Início, Minha Escala e Programas', () => {
      const nav = getMobileNavigation({
        id: 'user-1',
        globalRole: 'USER',
        status: 'ACTIVE',
        churchId: 'igreja-1',
        departmentMemberships: [],
      });

      const bottomPaths = nav.bottomBar.map((n) => n.href);
      expect(bottomPaths).toContain('/');
      expect(bottomPaths).toContain('/minha-escala');
      expect(bottomPaths).toContain('/programas');
    });
  });
});
