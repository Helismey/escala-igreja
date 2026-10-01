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
    id: 'trocas',
    label: 'Trocas de escala',
    icon: 'ArrowsLeftRight',
    href: '/trocas',
    requires: 'assignment:view:own',
    placement: 'more',
    priority: 22,
    group: 'meu-espaco',
  },
  {
    id: 'disponibilidade',
    label: 'Disponibilidade',
    icon: 'CalendarCheck',
    href: '/disponibilidade',
    requires: 'availability:manage:own',
    placement: 'more',
    priority: 25,
    group: 'meu-espaco',
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
    id: 'slots-abertos',
    label: 'Vagas abertas',
    icon: 'Warning',
    href: '/slots-abertos',
    requires: 'assignment:create',
    placement: 'more',
    priority: 32,
    group: 'gestao',
    badge: 'open-slots',
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
  {
    id: 'historico',
    label: 'Histórico e Relatórios',
    icon: 'ChartBar',
    href: '/historico',
    requires: 'assignment:create',
    placement: 'more',
    priority: 65,
    group: 'gestao',
  },

  // Administração
  {
    id: 'igrejas',
    label: 'Congregações',
    icon: 'Church',
    href: '/igrejas',
    requires: 'church:create',
    placement: 'more',
    priority: 69,
    group: 'administracao',
  },
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
    id: 'canais',
    label: 'Canais de envio',
    icon: 'PaperPlaneTilt',
    href: '/canais',
    requires: 'system:technical:manage',
    placement: 'more',
    priority: 72,
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
    // Para ADMIN_MASTER: acesso irrestrito
    if (user.globalRole === 'ADMIN_MASTER') {
      return true;
    }

    // Para PASTOR ou ELDER: avaliação direta das permissões
    if (user.globalRole === 'PASTOR' || user.globalRole === 'ELDER') {
      return can(user, item.requires);
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
  if (user?.globalRole === 'ADMIN_MASTER' || user?.globalRole === 'PASTOR') {
    primaryIds = ['inicio', 'escalas', 'membros'];
  } else if (user?.globalRole === 'ELDER') {
    primaryIds = ['inicio', 'escalas', 'programas'];
  } else if (user?.departmentMemberships.some((m) => m.role === 'MANAGER')) {
    primaryIds = ['inicio', 'minha-escala', 'escalas'];
  } else {
    primaryIds = ['inicio', 'minha-escala', 'programas'];
  }

  const bottomBar = sorted.filter((item) => primaryIds.includes(item.id));
  const moreSheet = sorted.filter((item) => !primaryIds.includes(item.id));

  return { bottomBar, moreSheet };
}
