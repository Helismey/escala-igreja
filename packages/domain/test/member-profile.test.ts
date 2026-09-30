import { describe, it, expect } from 'vitest';
import {
  validateProfileDates,
  exportMemberData,
  can,
  UserContext,
} from '../src/index.js';

describe('Perfil do Membro e LGPD (Domain)', () => {
  describe('validateProfileDates', () => {
    const fixedNow = new Date('2026-09-30T12:00:00Z');

    it('aceita datas válidas no passado com entrada após nascimento', () => {
      const res = validateProfileDates('1990-05-15', '2015-10-20', fixedNow);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('aceita quando datas são nulas ou indefinidas', () => {
      expect(validateProfileDates(null, null, fixedNow).valid).toBe(true);
      expect(validateProfileDates(undefined, undefined, fixedNow).valid).toBe(true);
    });

    it('rejeita data de nascimento no futuro', () => {
      const res = validateProfileDates('2030-01-01', null, fixedNow);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('futuro');
    });

    it('rejeita data de entrada ou batismo no futuro', () => {
      const res = validateProfileDates('1995-01-01', '2028-06-01', fixedNow);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('futuro');
    });

    it('rejeita data de entrada anterior à data de nascimento', () => {
      const res = validateProfileDates('2000-01-01', '1995-01-01', fixedNow);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('anterior à data de nascimento');
    });
  });

  describe('exportMemberData (Portabilidade LGPD Art. 18)', () => {
    it('formata os dados do titular e NUNCA expõe segredos técnicos', () => {
      const mockUser = {
        id: 'user-123',
        name: 'Maria Silva',
        email: 'maria@exemplo.com.br',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHash',
        mfaSecretEnc: 'aes:enc:secret',
        photoUrl: 'https://exemplo.com/fotos/maria.jpg',
        birthDate: new Date('1988-03-20'),
        gender: 'FEMININO',
        maritalStatus: 'CASADO',
        phonePrimary: '+5511999998888',
        phoneSecondary: null,
        whatsapp: '+5511999998888',
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'Goiânia',
          state: 'GO',
          postalCode: '74000-000',
        },
        emergencyContact: {
          name: 'João Silva',
          relationship: 'Esposo',
          phone: '+5511988887777',
        },
        joinedAt: new Date('2018-05-10'),
        preferredChannel: 'WHATSAPP',
        notes: 'Sem restrições',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        optOutWhatsapp: false,
        optOutEmail: false,
        optOutPush: false,
        optOutSms: true,
        termsAcceptedAt: new Date('2024-01-01T10:05:00Z'),
        termsVersion: '1.0',
        memberships: [
          {
            role: 'MEMBER',
            department: { name: 'Música' },
            functions: [{ function: { name: 'Vocal' } }],
          },
        ],
        assignments: [
          {
            id: 'asg-1',
            status: 'CONFIRMED',
            createdAt: new Date('2026-09-01'),
            slot: {
              title: 'Louvor Principal',
              startsAt: new Date('2026-09-10T19:00:00Z'),
              endsAt: new Date('2026-09-10T21:00:00Z'),
              program: { title: 'Culto de Celebração', date: new Date('2026-09-10') },
              department: { name: 'Música' },
            },
          },
        ],
        availabilities: [
          {
            kind: 'PREFERRED_WEEKDAY',
            weekday: 0,
            from: null,
            to: null,
          },
        ],
      };

      const exported = exportMemberData(mockUser as any);

      // Verificação de conformidade LGPD
      expect(exported.cabecalho.direitosDoTitular).toContain('Lei nº 13.709/2018');
      expect(exported.dadosPessoais.nomeCompleto).toBe('Maria Silva');
      expect(exported.dadosPessoais.email).toBe('maria@exemplo.com.br');
      expect(exported.dadosPessoais.dataNascimento).toBe('1988-03-20');
      expect(exported.contato.telefonePrincipal).toBe('+5511999998888');
      expect(exported.preferenciasPrivacidade.optOut.sms).toBe(true);
      expect(exported.departamentosEFuncoes[0].departamento).toBe('Música');
      expect(exported.departamentosEFuncoes[0].funcoes).toContain('Vocal');
      expect(exported.historicoEscalas[0].programa).toBe('Culto de Celebração');

      // Garantia absoluta de que segredos nunca constam no JSON exportado
      const jsonString = JSON.stringify(exported);
      expect(jsonString).not.toContain('passwordHash');
      expect(jsonString).not.toContain('fakeHash');
      expect(jsonString).not.toContain('mfaSecretEnc');
      expect(jsonString).not.toContain('aes:enc');
    });
  });

  describe('Autorização de Perfil (can())', () => {
    const activeMember: UserContext = {
      id: 'usr-1',
      globalRole: 'USER',
      status: 'ACTIVE',
      departmentMemberships: [{ departmentId: 'dept-1', role: 'MEMBER' }],
    };

    const pendingMember: UserContext = {
      id: 'usr-2',
      globalRole: 'USER',
      status: 'PENDING',
      departmentMemberships: [],
    };

    it('permite que o membro veja, atualize e exporte seu próprio perfil', () => {
      expect(can(activeMember, 'profile:view:own', { targetUserId: 'usr-1' })).toBe(true);
      expect(can(activeMember, 'profile:update:own', { targetUserId: 'usr-1' })).toBe(true);
      expect(can(activeMember, 'profile:export:own', { targetUserId: 'usr-1' })).toBe(true);
    });

    it('proíbe membro de ver ou alterar perfil de terceiro diretamente', () => {
      expect(can(activeMember, 'profile:view:other', { targetUserId: 'usr-other', departmentId: 'dept-1' })).toBe(false);
      expect(can(activeMember, 'profile:update:other', { targetUserId: 'usr-other', departmentId: 'dept-1' })).toBe(false);
    });

    it('proíbe membro pendente de qualquer ação no perfil', () => {
      expect(can(pendingMember, 'profile:view:own', { targetUserId: 'usr-2' })).toBe(false);
      expect(can(pendingMember, 'profile:update:own', { targetUserId: 'usr-2' })).toBe(false);
      expect(can(pendingMember, 'profile:export:own', { targetUserId: 'usr-2' })).toBe(false);
    });
  });
});
