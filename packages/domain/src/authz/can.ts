/**
 * Autorização centralizada RBAC com escopo departamental.
 * Regra: Negar por padrão.
 */

export type GlobalRole = 'ADMIN_MASTER' | 'USER';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
export type DepartmentRole = 'MANAGER' | 'MEMBER';

export interface UserContext {
  id: string;
  globalRole: GlobalRole;
  status: AccountStatus;
  departmentMemberships: {
    departmentId: string;
    role: DepartmentRole;
  }[];
}

export type Action =
  // Sessão & Perfil
  | 'profile:view:own'
  | 'profile:update:own'
  | 'profile:view:other'
  | 'profile:update:other'
  | 'profile:export:own'
  // Autocadastro e Aprovações
  | 'registration:approve'
  | 'registration:reject'
  // Membros
  | 'member:create'
  | 'member:import'
  | 'member:export'
  // Departamentos e Funções
  | 'department:create'
  | 'department:update'
  | 'department:view'
  | 'department:member:add'
  | 'department:member:update'
  | 'department:member:remove'
  | 'function:create'
  | 'function:update'
  | 'manager:assign'
  // Programas
  | 'program:create'
  | 'program:update'
  | 'program:delete'
  | 'program:clone'
  | 'program:view'
  // Escalas (Assignments)
  | 'assignment:create'
  | 'assignment:delete'
  | 'assignment:confirm:own'
  | 'assignment:decline:own'
  | 'assignment:view:all'
  | 'assignment:view:department'
  | 'assignment:view:own'
  // Disponibilidade
  | 'availability:manage:own'
  // Configurações da Igreja & Auditoria
  | 'church:settings:update'
  | 'audit:view';

export interface ResourceContext {
  targetUserId?: string;
  departmentId?: string;
  departmentIds?: string[];
  newRole?: GlobalRole;
}

/**
 * Função pura de autorização: can(user, action, resource).
 */
export function can(
  user: UserContext | null | undefined,
  action: Action,
  resource?: ResourceContext
): boolean {
  if (!user) {
    return false;
  }

  // Contas PENDENTES, REJEITADAS ou INATIVAS não têm acesso a nenhuma ação protegida
  if (user.status !== 'ACTIVE') {
    return false;
  }

  // 1. ADMIN_MASTER possui acesso a tudo, exceto regras especiais de auto-modificação
  if (user.globalRole === 'ADMIN_MASTER') {
    // Ninguém pode rebaixar seu próprio papel para evitar ficar sem ADMIN_MASTER
    if (action === 'profile:update:other' && resource?.targetUserId === user.id && resource?.newRole && resource.newRole !== 'ADMIN_MASTER') {
      return false;
    }
    return true;
  }

  // 2. Ações exclusivas de ADMIN_MASTER (bloqueadas para qualquer outro perfil)
  const adminOnlyActions: Action[] = [
    'department:create',
    'manager:assign',
    'church:settings:update',
    'audit:view',
    'assignment:view:all',
    'member:import',
    'member:export',
  ];

  if (adminOnlyActions.includes(action)) {
    return false;
  }

  // Determina departamentos onde o usuário é GESTOR
  const managedDepartmentIds = user.departmentMemberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId);

  const isManagerOf = (deptId?: string): boolean => {
    if (!deptId) return false;
    return managedDepartmentIds.includes(deptId);
  };

  const isManagerOfAny = (deptIds?: string[]): boolean => {
    if (!deptIds || deptIds.length === 0) return false;
    return deptIds.some((id) => managedDepartmentIds.includes(id));
  };

  // 3. Regras específicas por ação
  switch (action) {
    // Perfil próprio
    case 'profile:view:own':
    case 'profile:update:own':
    case 'profile:export:own':
    case 'availability:manage:own':
      return !resource?.targetUserId || resource.targetUserId === user.id;

    // Confirmação e desmarcação própria
    case 'assignment:confirm:own':
    case 'assignment:decline:own':
    case 'assignment:view:own':
      return !resource?.targetUserId || resource.targetUserId === user.id;

    // Ver outro perfil (membro comum só vê se for de equipe, mas sanitizado via DTO; gestor vê completo do seu dept)
    case 'profile:view:other':
      if (resource?.departmentId) {
        return isManagerOf(resource.departmentId);
      }
      return false;

    // Alterar perfil de outro usuário (apenas gestor do departamento ou admin)
    case 'profile:update:other':
      // Membro nunca pode alterar outro usuário nem se autopromover
      if (resource?.newRole && resource.newRole === 'ADMIN_MASTER') {
        return false;
      }
      return isManagerOf(resource?.departmentId);

    // Aprovações e rejeições de cadastro
    case 'registration:approve':
    case 'registration:reject':
      return isManagerOf(resource?.departmentId);

    // Departamentos e Funções
    case 'department:view':
      return true; // Membros ativos podem visualizar a lista de departamentos da igreja
    case 'department:update':
    case 'department:member:add':
    case 'department:member:update':
    case 'department:member:remove':
    case 'member:create':
    case 'function:create':
    case 'function:update':
      return isManagerOf(resource?.departmentId);

    // Programas
    case 'program:view':
      return true; // Membros podem ver a agenda de programas
    case 'program:create':
    case 'program:update':
    case 'program:delete':
    case 'program:clone':
      if (resource?.departmentId) {
        return isManagerOf(resource.departmentId);
      }
      if (resource?.departmentIds) {
        return isManagerOfAny(resource.departmentIds);
      }
      return false;

    // Escalas (atribuir e remover)
    case 'assignment:create':
    case 'assignment:delete':
    case 'assignment:view:department':
      return isManagerOf(resource?.departmentId);

    default:
      return false;
  }
}
