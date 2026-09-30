'use client';

import React, { useState } from 'react';
import { AlertBanner } from '@/components/AlertBanner';

interface MemberProfileData {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  whatsapp?: string;
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  emergencyContact: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  joinedAt?: string;
  preferredChannel: 'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS';
  notes?: string;
  globalRole: string;
  status: string;
  optOutWhatsapp: boolean;
  optOutEmail: boolean;
  optOutPush: boolean;
  optOutSms: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  memberships: {
    departmentName: string;
    role: string;
    functions: string[];
  }[];
}

type TabKey = 'pessoal' | 'contato' | 'endereco' | 'privacidade';

export function PerfilClient({ initialData }: { initialData: MemberProfileData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('pessoal');

  // Dados Pessoais
  const [name, setName] = useState(initialData.name);
  const [photoUrl, setPhotoUrl] = useState(initialData.photoUrl || '');
  const [birthDate, setBirthDate] = useState(initialData.birthDate || '');
  const [gender, setGender] = useState(initialData.gender || '');
  const [maritalStatus, setMaritalStatus] = useState(initialData.maritalStatus || '');
  const [joinedAt, setJoinedAt] = useState(initialData.joinedAt || '');
  const [notes, setNotes] = useState(initialData.notes || '');

  // Contato
  const [phonePrimary, setPhonePrimary] = useState(initialData.phonePrimary || '');
  const [phoneSecondary, setPhoneSecondary] = useState(initialData.phoneSecondary || '');
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || '');
  const [preferredChannel, setPreferredChannel] = useState<'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS'>(
    initialData.preferredChannel
  );

  // Notificações e Opt-outs
  const [optOutWhatsapp, setOptOutWhatsapp] = useState(initialData.optOutWhatsapp);
  const [optOutEmail, setOptOutEmail] = useState(initialData.optOutEmail);
  const [optOutPush, setOptOutPush] = useState(initialData.optOutPush);
  const [optOutSms, setOptOutSms] = useState(initialData.optOutSms);

  // Endereço
  const [street, setStreet] = useState(initialData.address?.street || '');
  const [number, setNumber] = useState(initialData.address?.number || '');
  const [complement, setComplement] = useState(initialData.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(initialData.address?.neighborhood || '');
  const [city, setCity] = useState(initialData.address?.city || '');
  const [state, setState] = useState(initialData.address?.state || '');
  const [postalCode, setPostalCode] = useState(initialData.address?.postalCode || '');

  // Contato de emergência
  const [emergencyName, setEmergencyName] = useState(initialData.emergencyContact?.name || '');
  const [emergencyRel, setEmergencyRel] = useState(initialData.emergencyContact?.relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergencyContact?.phone || '');

  // Estado da UI
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      // Monta objeto de endereço se preenchido
      let addressPayload: any = null;
      if (street || number || city || state || postalCode) {
        addressPayload = {
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          postalCode: postalCode.trim(),
        };
      }

      // Monta objeto de emergência se preenchido
      let emergencyPayload: any = null;
      if (emergencyName || emergencyPhone) {
        emergencyPayload = {
          name: emergencyName.trim(),
          relationship: emergencyRel.trim(),
          phone: emergencyPhone.trim(),
        };
      }

      const payload = {
        name: name.trim(),
        photoUrl: photoUrl.trim() || null,
        birthDate: birthDate || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        phonePrimary: phonePrimary.trim(),
        phoneSecondary: phoneSecondary.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: addressPayload,
        emergencyContact: emergencyPayload,
        joinedAt: joinedAt || null,
        preferredChannel,
        notes: notes.trim() || null,
        optOutWhatsapp,
        optOutEmail,
        optOutPush,
        optOutSms,
      };

      const res = await fetch('/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: 'erro',
          text: data.error || 'Não foi possível atualizar o perfil. Verifique os campos e tente novamente.',
        });
        return;
      }

      setMessage({
        type: 'sucesso',
        text: 'Seu perfil foi atualizado com sucesso!',
      });
    } catch {
      setMessage({
        type: 'erro',
        text: 'Erro de comunicação com o servidor. Verifique sua conexão e tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/perfil/exportar');
      if (!response.ok) {
        throw new Error('Falha ao exportar dados.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `escala-igreja-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setMessage({
        type: 'erro',
        text: 'Não foi possível gerar a cópia dos dados no momento. Tente novamente mais tarde.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Resumo do Perfil e Equipe */}
      <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-2xl overflow-hidden border-2 border-line">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-ink">{name}</h2>
            <p className="text-sm text-ink-muted">{initialData.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-xs bg-bg px-2.5 py-0.5 rounded-control font-semibold text-ink-muted border border-line">
                {initialData.globalRole === 'ADMIN_MASTER'
                  ? 'Administrador Geral'
                  : 'Voluntário'}
              </span>
              {initialData.memberships.map((m, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-control font-semibold"
                >
                  {m.departmentName}
                  {m.role === 'MANAGER' && ' (Gestor)'}
                  {m.functions.length > 0 && ` • ${m.functions.join(', ')}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {message && <AlertBanner type={message.type} message={message.text} />}

      {/* Abas de Navegação */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('pessoal')}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-control border-b-2 transition-colors min-h-touch ${
            activeTab === 'pessoal'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Dados Pessoais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contato')}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-control border-b-2 transition-colors min-h-touch ${
            activeTab === 'contato'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Contato & Notificações
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('endereco')}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-control border-b-2 transition-colors min-h-touch ${
            activeTab === 'endereco'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Endereço & Emergência
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('privacidade')}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-control border-b-2 transition-colors min-h-touch ${
            activeTab === 'privacidade'
              ? 'border-primary text-primary bg-surface'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Privacidade & LGPD
        </button>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ABA: DADOS PESSOAIS */}
        {activeTab === 'pessoal' && (
          <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-bold text-lg text-ink">Informações Básicas</h3>
            <p className="text-xs text-ink-muted">
              Seus dados pessoais para identificação na escala de voluntários.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  URL da Foto de Perfil
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/sua-foto.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
                <span className="text-[11px] text-ink-muted block">
                  Insira o link seguro (HTTPS) de sua foto para exibição no aplicativo.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Sexo
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                >
                  <option value="">Selecione...</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Estado Civil
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                >
                  <option value="">Selecione...</option>
                  <option value="SOLTEIRO">Solteiro(a)</option>
                  <option value="CASADO">Casado(a)</option>
                  <option value="DIVORCIADO">Divorciado(a)</option>
                  <option value="VIUVO">Viúvo(a)</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Data de Batismo ou Entrada
                </label>
                <input
                  type="date"
                  value={joinedAt}
                  onChange={(e) => setJoinedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Observações ou Restrições
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Restrições alimentares, alergias, necessidades de acessibilidade ou observações para a equipe."
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-[11px] text-ink-muted text-right block">
                  {notes.length}/500 caracteres
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ABA: CONTATO E NOTIFICAÇÕES */}
        {activeTab === 'contato' && (
          <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Telefones e WhatsApp</h3>
              <p className="text-xs text-ink-muted">
                Dados de contato usados para avisos e convocações da escala.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Telefone Principal (Celular) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+5511999998888"
                  value={phonePrimary}
                  onChange={(e) => setPhonePrimary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
                <span className="text-[11px] text-ink-muted block">
                  Formato internacional com código do país (ex.: +55...)
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  WhatsApp (se diferente do principal)
                </label>
                <input
                  type="text"
                  placeholder="+5511999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Telefone Secundário / Residencial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="+551133334444"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 pt-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Canal Preferido de Lembrete
                </label>
                <select
                  value={preferredChannel}
                  onChange={(e) =>
                    setPreferredChannel(e.target.value as 'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS')
                  }
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                >
                  <option value="WHATSAPP">WhatsApp (Recomendado)</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PUSH">Notificação Push (App)</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
            </div>

            <div className="border-t border-line pt-5 space-y-3">
              <h4 className="font-semibold text-sm text-ink">Preferências de Envio (Opt-out)</h4>
              <p className="text-xs text-ink-muted">
                Você pode desligar canais específicos pelos quais não deseja receber avisos automáticos:
              </p>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!optOutWhatsapp}
                    onChange={(e) => setOptOutWhatsapp(!e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-ink">Receber avisos e lembretes por WhatsApp</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!optOutEmail}
                    onChange={(e) => setOptOutEmail(!e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-ink">Receber avisos e escalas por E-mail</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!optOutPush}
                    onChange={(e) => setOptOutPush(!e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-ink">Receber notificações Push no celular/navegador</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!optOutSms}
                    onChange={(e) => setOptOutSms(!e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-ink">Receber alertas de emergência por SMS</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ABA: ENDEREÇO E EMERGÊNCIA */}
        {activeTab === 'endereco' && (
          <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Endereço Residencial</h3>
              <p className="text-xs text-ink-muted">
                Utilizado para organização de caronas e contato pastoral em caso de necessidade.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  CEP
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Logradouro / Rua
                </label>
                <input
                  type="text"
                  placeholder="Rua, Avenida, Alameda..."
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="123"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Complemento
                </label>
                <input
                  type="text"
                  placeholder="Apto 101, Bloco B..."
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Bairro
                </label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                  Estado (UF)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                />
              </div>
            </div>

            <div className="border-t border-line pt-5 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-ink">Contato de Emergência</h4>
                <p className="text-xs text-ink-muted">
                  Pessoa para contato rápido caso ocorra algum imprevisto ou emergência durante o serviço.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                    Grau de Parentesco
                  </label>
                  <input
                    type="text"
                    placeholder="Cônjuge, Mãe, Pai, Irmão(ã)..."
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-ink uppercase tracking-wider block">
                    Telefone de Emergência
                  </label>
                  <input
                    type="text"
                    placeholder="+5511999998888"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg rounded-control border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-touch"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PRIVACIDADE E LGPD */}
        {activeTab === 'privacidade' && (
          <div className="bg-surface rounded-surface border border-line p-5 sm:p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Privacidade e Proteção de Dados (LGPD)</h3>
              <p className="text-xs text-ink-muted">
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem controle total sobre suas informações.
              </p>
            </div>

            <div className="bg-bg rounded-control p-4 border border-line space-y-3">
              <h4 className="font-semibold text-sm text-ink">Direito de Portabilidade de Dados (Art. 18)</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Você pode baixar a qualquer momento uma cópia estruturada de todos os seus dados cadastrais, histórico de escalas, participações e departamentos vinculados.
              </p>
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-surface border border-line text-ink font-semibold text-xs rounded-control hover:bg-line/20 transition-colors min-h-touch"
              >
                {exporting ? 'Gerando arquivo...' : 'Baixar cópia dos meus dados (JSON)'}
              </button>
            </div>

            <div className="border-t border-line pt-4 space-y-2">
              <h4 className="font-semibold text-sm text-ink">Consentimento e Termos</h4>
              <p className="text-xs text-ink-muted">
                {initialData.termsAcceptedAt ? (
                  <>
                    Termos de privacidade aceitos em{' '}
                    <span className="font-semibold text-ink">
                      {new Date(initialData.termsAcceptedAt).toLocaleDateString('pt-BR')}
                    </span>{' '}
                    (Versão {initialData.termsVersion || '1.0'}).
                  </>
                ) : (
                  'Termos pendentes de confirmação.'
                )}
              </p>
              <p className="text-xs text-ink-muted">
                Seus dados de contato só ficam visíveis para a liderança e gestores dos departamentos aos quais você pertence. Outros voluntários veem apenas seu nome e função na escala.
              </p>
            </div>
          </div>
        )}

        {/* Botão de Submissão Fixo */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary text-white font-semibold text-sm rounded-control hover:opacity-95 transition-opacity min-h-touch disabled:opacity-50"
          >
            {saving ? 'Salvando alterações...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
