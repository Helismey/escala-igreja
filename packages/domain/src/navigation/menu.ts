import { Action, can, UserContext } from '../authz/can.js';

export type MenuGroup = 'meu-espaco' | 'gestao' | 'administracao';
export type MenuBadgeKind = 'pending-approvals' | 'open-slots' | 'unconfirmed';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  requires: Action;
  placement: 'primary' | 'more';
  priority: number;
  group: MenuGroup;
  badge?: MenuBadgeKind;
}

export const ALL_MENU_ITEMS: MenuItem[] = [
  // Meu Espaço
  {
    id: 'inicio',
    label: 'Início',
    icon: 'House',
    href: '/',
    requires: 'profile:view:own',
    placement: 'primary',
    priority: 10,
    group: 'meu-espaco',
  },
  {
    id: 'minha-escala',
    label: 'Minha escala',
    icon: 'CalendarCheck',
    href: '/minha-escala',
    requires: 'assignment:view:own',
    placement: 'primary',
    priority: 20,
    group: 'meu-espaco',
    badge: 'unconfirmed',
  },
  {
    id: 'meu-perfil',
    label: 'Meu perfil',
    icon: 'UserCircle',
    href: '/perfil',
    requires: 'profile:view:own',
    placement: 'more',
    priority: 80,
    group: 'meu-espaco',
  },

  // Gestão
  {
    id: 'escalas',
    label: 'Escalas',
    icon: 'ListChecks',
    href: '/escalas',
    requires: 'assignment:create',
    placement: 'primary',
    priority: 30,
    group: 'gestao',
    badge: 'open-slots',
  },
  {
    id: 'programas',
    label: 'Programas',
    icon: 'ListBullets',
    href: '/programas',
    requires: 'program:view',
    placement: 'more',
    priority: 40,
    group: 'gestao',
  },
  {
    id: 'membros',
    label: 'Membros',
    icon: 'UsersThree',
    href: '/membros',
    requires: 'profile:view:other',
    placement: 'primary',
    priority: 35,
    group: 'gestao',
  },
  {
    id: 'aprovacoes',
    label: 'Aprovações',
    icon: 'UserCheck',
    href: '/aprovacoes',
    requires: 'registration:approve',
    placement: 'more',
    priority: 50,
    group: 'gestao',
    badge: 'pending-approvals',
  },
  {
    id: 'departamentos',
    label: 'Departamentos',
    icon: 'SquaresFour',
    href: '/departamentos',
    requires: 'department:view',
    placement: 'more',
    priority: 60,
    group: 'gestao',
  },

  // Administração
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: 'Gear',
    href: '/configuracoes',
    requires: 'church:settings:update',
    placement: 'more',
    priority: 70,
    group: 'administracao',
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    icon: 'ClipboardText',
    href: '/auditoria',
    requires: 'audit:view',
    placement: 'more',
    priority: 75,
    group: 'administracao',
  },
];

export interface MenuBadgeCounts {
  pendingApprovals?: number;
  openSlots?: number;
  unconfirmed?: number;
}

/**
 * Filtra os itens de navegação permitidos para o usuário autenticado.
 */
export function getAuthorizedMenuItems(user: UserContext | null | undefined): MenuItem[] {
  if (!user || user.status !== 'ACTIVE') {
    return [];
  }

  return ALL_MENU_ITEMS.filter((item) => {
    // Para itens com escopo amplo ou geral
    if (user.globalRole === 'ADMIN_MASTER') {
      return true;
    }

    // Para gestores: verifica se possui algum departamento onde é gestor para ações de gestão
    const hasManagedDept = user.departmentMemberships.some((m) => m.role === 'MANAGER');
    const firstManagedDeptId = user.departmentMemberships.find((m) => m.role === 'MANAGER')?.departmentId;

    if (item.requires === 'profile:view:other' || item.requires === 'assignment:create' || item.requires === 'registration:approve') {
      return hasManagedDept && can(user, item.requires, { departmentId: firstManagedDeptId });
    }

    return can(user, item.requires);
  });
}

/**
 * Separa os itens em barra inferior (celular) e lista do menu "Mais".
 */
export function getMobileNavigation(user: UserContext | null | undefined): {
  bottomBar: MenuItem[];
  moreSheet: MenuItem[];
} {
  const authorized = getAuthorizedMenuItems(user);
  if (authorized.length === 0) {
    return { bottomBar: [], moreSheet: [] };
  }

  // Ordena por prioridade
  const sorted = [...authorized].sort((a, b) => a.priority - b.priority);

  // Perfil específico de barra inferior
  let primaryIds: string[] = [];
  if (user?.globalRole === 'ADMIN_MASTER') {
    primaryIds = ['inicio', 'escalas', 'membros'];
  } else if (user?.departmentMemberships.some((m) => m.role === 'MANAGER')) {
    primaryIds = ['inicio', 'minha-escala', 'escalas'];
  } else {
    primaryIds = ['inicio', 'minha-escala', 'programas'];
  }

  const bottomBar = sorted.filter((item) => primaryIds.includes(item.id));
  const moreSheet = sorted.filter((item) => !primaryIds.includes(item.id));

  return { bottomBar, moreSheet };
}
