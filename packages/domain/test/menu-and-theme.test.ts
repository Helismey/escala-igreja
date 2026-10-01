import { describe, expect, it } from 'vitest';
import {
  getAuthorizedMenuItems,
  getMobileNavigation,
  getContrastRatio,
  validateChurchThemeColor,
  UserContext,
} from '../src/index.js';

describe('Navegação e Menus', () => {
  const membroUser: UserContext = {
    id: 'm-1',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [{ departmentId: 'dept-louvor', role: 'MEMBER' }],
  };

  const gestorUser: UserContext = {
    id: 'g-1',
    globalRole: 'USER',
    status: 'ACTIVE',
    departmentMemberships: [{ departmentId: 'dept-louvor', role: 'MANAGER' }],
  };

  const adminUser: UserContext = {
    id: 'a-1',
    globalRole: 'ADMIN_MASTER',
    status: 'ACTIVE',
    departmentMemberships: [],
  };

  it('exibe apenas itens pertinentes para MEMBRO', () => {
    const items = getAuthorizedMenuItems(membroUser);
    const ids = items.map((i) => i.id);

    expect(ids).toContain('inicio');
    expect(ids).toContain('minha-escala');
    expect(ids).toContain('programas');
    expect(ids).toContain('departamentos');
    expect(ids).not.toContain('configuracoes');
    expect(ids).not.toContain('auditoria');
    expect(ids).not.toContain('aprovacoes');
  });

  it('exibe itens de gestão para GESTOR', () => {
    const items = getAuthorizedMenuItems(gestorUser);
    const ids = items.map((i) => i.id);

    expect(ids).toContain('escalas');
    expect(ids).toContain('membros');
    expect(ids).toContain('aprovacoes');
    expect(ids).not.toContain('configuracoes');
    expect(ids).not.toContain('auditoria');
  });

  const pastorUser: UserContext = {
    id: 'p-1',
    globalRole: 'PASTOR',
    status: 'ACTIVE',
    pastorChurchIds: ['igreja-central'],
    departmentMemberships: [],
  };

  const anciaoUser: UserContext = {
    id: 'e-1',
    globalRole: 'ELDER',
    status: 'ACTIVE',
    churchId: 'igreja-central',
    departmentMemberships: [],
  };

  it('exibe itens administrativos para ADMIN_MASTER', () => {
    const items = getAuthorizedMenuItems(adminUser);
    const ids = items.map((i) => i.id);

    expect(ids).toContain('configuracoes');
    expect(ids).toContain('canais');
    expect(ids).toContain('auditoria');
    expect(ids).toContain('escalas');
  });

  it('exibe configurações da igreja mas OCULTA canais técnicos e auditoria para PASTOR', () => {
    const items = getAuthorizedMenuItems(pastorUser);
    const ids = items.map((i) => i.id);

    expect(ids).toContain('configuracoes');
    expect(ids).toContain('escalas');
    expect(ids).toContain('programas');
    expect(ids).toContain('membros');
    expect(ids).toContain('aprovacoes');

    // Bloqueados para Pastor
    expect(ids).not.toContain('canais');
    expect(ids).not.toContain('auditoria');
  });

  it('exibe gestão completa da congregação mas OCULTA canais e configurações gerais para ANCIÃO', () => {
    const items = getAuthorizedMenuItems(anciaoUser);
    const ids = items.map((i) => i.id);

    expect(ids).toContain('escalas');
    expect(ids).toContain('programas');
    expect(ids).toContain('membros');
    expect(ids).toContain('aprovacoes');
    expect(ids).toContain('departamentos');

    // Bloqueados para Ancião
    expect(ids).not.toContain('configuracoes');
    expect(ids).not.toContain('canais');
    expect(ids).not.toContain('auditoria');
  });

  it('divide navegação móvel em barra inferior e menu Mais', () => {
    const navMembro = getMobileNavigation(membroUser);
    expect(navMembro.bottomBar.map((i) => i.id)).toEqual(['inicio', 'minha-escala', 'programas']);
    expect(navMembro.moreSheet.map((i) => i.id)).toContain('meu-perfil');

    const navAdmin = getMobileNavigation(adminUser);
    expect(navAdmin.bottomBar.map((i) => i.id)).toEqual(['inicio', 'escalas', 'membros']);
    expect(navAdmin.moreSheet.map((i) => i.id)).toContain('configuracoes');
  });
});

describe('Tema da Igreja e Contraste WCAG 2.1', () => {
  it('calcula contraste da cor padrão Petróleo (#0F4C5C) sobre Branco', () => {
    const ratio = getContrastRatio('#0F4C5C', '#FFFFFF');
    expect(ratio).toBeGreaterThan(9); // 9.5:1
  });

  it('valida cor escura adequada para texto branco', () => {
    const report = validateChurchThemeColor('#0F4C5C');
    expect(report.passesWhiteText).toBe(true);
    expect(report.contrastWithWhite).toBeGreaterThanOrEqual(4.5);
  });

  it('reprova cor muito clara para texto branco e sugere tom ajustado', () => {
    const lightYellow = '#F2B632'; // Mel
    const report = validateChurchThemeColor(lightYellow);

    expect(report.passesWhiteText).toBe(false);
    expect(report.suggestedHex).toBeDefined();
    // O tom sugerido deve passar no contraste com branco
    if (report.suggestedHex) {
      expect(getContrastRatio(report.suggestedHex, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    }
  });
});
