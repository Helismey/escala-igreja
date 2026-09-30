/**
 * Sanitização de dados de membros conforme LGPD e regras de autorização.
 * Membros comuns só veem nome, foto e funções da equipe de terceiros.
 * Gestores do departamento e ADMIN_MASTER têm acesso aos dados operacionais de contato.
 */

export interface RawMemberData {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  whatsapp?: string | null;
  birthDate?: Date | string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  address?: unknown;
  emergencyContact?: unknown;
  joinedAt?: Date | string | null;
  preferredChannel?: string | null;
  notes?: string | null;
  departmentMemberships?: {
    departmentId: string;
    departmentName?: string;
    role: string;
    functions: { functionId: string; functionName?: string }[];
  }[];
}

export interface SanitizedPublicMember {
  id: string;
  name: string;
  photoUrl?: string | null;
  departmentMemberships?: {
    departmentId: string;
    departmentName?: string;
    role: string;
    functions: { functionId: string; functionName?: string }[];
  }[];
}

/**
 * Mascara telefone para exibição segura em logs ou interfaces resumidas:
 * Exemplo: +55 62 98765-4321 -> +55 62 9****-4321
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length < 8) return '****';
  const visibleStart = clean.slice(0, clean.length - 8);
  const visibleEnd = clean.slice(-4);
  return `${visibleStart}****-${visibleEnd}`;
}

/**
 * Mascara e-mail para exibição segura:
 * Exemplo: usuario@dominio.com -> u***o@dominio.com
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Sanitiza o membro para visualização pública entre voluntários (sem PII sensível).
 */
export function sanitizeMemberForVolunteers(member: RawMemberData): SanitizedPublicMember {
  return {
    id: member.id,
    name: member.name,
    photoUrl: member.photoUrl,
    departmentMemberships: member.departmentMemberships,
  };
}
