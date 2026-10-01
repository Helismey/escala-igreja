'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertBanner } from '@/components/AlertBanner';
import { maskPhoneNumber, maskEmail } from '@escala-igreja/domain';

export interface MemberListItem {
  id: string;
  name: string;
  email: string;
  phonePrimary: string | null;
  whatsapp: string | null;
  photoUrl: string | null;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'INACTIVE';
  isMinor: boolean;
  guardianName: string | null;
  guardianPhone: string | null;
  memberships: {
    id: string;
    departmentId: string;
    departmentName: string;
    functions: { id: string; name: string }[];
  }[];
}

export interface DepartmentOption {
  id: string;
  name: string;
  functions: { id: string; name: string }[];
}

interface MembrosClientProps {
  initialMembers: MemberListItem[];
  departments: DepartmentOption[];
  isAdmin: boolean;
  managedDepartmentIds: string[];
}

export function MembrosClient({
  initialMembers,
  departments,
  isAdmin,
  managedDepartmentIds,
}: MembrosClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [filterMinorsOnly, setFilterMinorsOnly] = useState(false);

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'sucesso' | 'erro'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados do formulário de Novo Voluntário
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createWhatsapp, setCreateWhatsapp] = useState('');
  const [createDeptId, setCreateDeptId] = useState('');
  const [createFunctionIds, setCreateFunctionIds] = useState<string[]>([]);
  const [createStatus, setCreateStatus] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [createIsMinor, setCreateIsMinor] = useState(false);
  const [createGuardianName, setCreateGuardianName] = useState('');
  const [createGuardianPhone, setCreateGuardianPhone] = useState('');

  // Estados da Importação de Planilha
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    totalRows: number;
    validRows: any[];
    invalidRows: { index: number; data: any; errors: string[] }[];
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    newCount: number;
  } | null>(null);
  const [importDefaultStatus, setImportDefaultStatus] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importSuccessResult, setImportSuccessResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Departamentos disponíveis para o usuário adicionar membros
  const assignableDepartments = isAdmin
    ? departments
    : departments.filter((d) => managedDepartmentIds.includes(d.id));

  // Funções do departamento atualmente selecionado no modal de criação
  const currentDeptFunctions =
    departments.find((d) => d.id === createDeptId)?.functions || [];

  // Filtragem local de membros
  const filteredMembers = initialMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.memberships.some(
        (m) =>
          m.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.functions.some((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    const matchesDept =
      selectedDeptFilter === 'ALL' ||
      member.memberships.some((m) => m.departmentId === selectedDeptFilter);

    const matchesMinor = !filterMinorsOnly || member.isMinor;

    return matchesSearch && matchesDept && matchesMinor;
  });

  // Handler de Criação Manual de Membro
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/membros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          phonePrimary: createPhone || null,
          whatsapp: createWhatsapp || null,
          departmentId: createDeptId || null,
          functionIds: createFunctionIds,
          status: createStatus,
          isMinor: createIsMinor,
          guardianName: createIsMinor ? createGuardianName : null,
          guardianPhone: createIsMinor ? createGuardianPhone : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao cadastrar voluntário.' });
        return;
      }

      setMessage({ type: 'sucesso', text: `Voluntário ${createName} cadastrado com sucesso!` });
      setShowCreateModal(false);
      resetCreateForm();
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePhone('');
    setCreateWhatsapp('');
    setCreateDeptId('');
    setCreateFunctionIds([]);
    setCreateStatus('ACTIVE');
    setCreateIsMinor(false);
    setCreateGuardianName('');
    setCreateGuardianPhone('');
  };

  // Handler de Envio da Planilha para Prévia
  const handlePreviewImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setMessage(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/membros/importar/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao processar planilha.' });
        return;
      }

      setImportPreview(data);
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão ao enviar planilha.' });
    } finally {
      setLoading(false);
    }
  };

  // Handler de Confirmação da Importação
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validRows.length === 0) return;

    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/membros/importar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: importPreview.validRows,
          defaultStatus: importDefaultStatus,
          updateExisting: importUpdateExisting,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'erro', text: data.error || 'Erro ao confirmar importação.' });
        return;
      }

      setImportSuccessResult(data);
      setMessage({
        type: 'sucesso',
        text: `Importação concluída: ${data.created} novo(s) voluntário(s), ${data.updated} atualizado(s).`,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage({ type: 'erro', text: 'Erro de conexão ao concluir importação.' });
    } finally {
      setLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
    setImportSuccessResult(null);
  };

  return (
    <div className="space-y-6">
      {message && <AlertBanner type={message.type} message={message.text} />}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Equipe e Voluntários</h1>
          <p className="text-sm text-ink-muted mt-1">
            Gestão de voluntários, equipes por departamento e importação/exportação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isAdmin && (
            <a
              href="/api/membros/exportar"
              className="px-3.5 py-2 bg-surface text-ink border border-line font-medium rounded-control hover:bg-bg text-xs sm:text-sm min-h-touch inline-flex items-center justify-center transition"
            >
              📥 Exportar CSV
            </a>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportSuccessResult(null);
                setImportPreview(null);
              }}
              className="px-3.5 py-2 bg-surface text-ink border border-line font-medium rounded-control hover:bg-bg text-xs sm:text-sm min-h-touch inline-flex items-center justify-center transition"
            >
              📄 Importar Planilha
            </button>
          )}

          {(isAdmin || managedDepartmentIds.length > 0) && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white font-semibold rounded-control hover:opacity-95 text-xs sm:text-sm min-h-touch inline-flex items-center justify-center shadow-sm transition"
            >
              + Novo Voluntário
            </button>
          )}
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-surface rounded-surface border border-line p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail, departamento ou função..."
              className="w-full px-3.5 py-2.5 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink min-h-touch"
            >
              <option value="ALL">Todos os Departamentos</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center space-x-2 text-xs sm:text-sm text-ink-muted cursor-pointer px-2 py-1 select-none">
              <input
                type="checkbox"
                checked={filterMinorsOnly}
                onChange={(e) => setFilterMinorsOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary h-4 w-4"
              />
              <span>Menores de 18 anos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lista de Voluntários */}
      <div className="bg-surface rounded-surface border border-line divide-y divide-line overflow-hidden shadow-sm">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Nenhum voluntário encontrado com os filtros aplicados.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const canViewContacts =
              isAdmin ||
              member.memberships.some((m) => managedDepartmentIds.includes(m.departmentId));

            return (
              <div
                key={member.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-bg/40 transition"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base overflow-hidden border border-line shrink-0">
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h3 className="font-semibold text-ink text-base">{member.name}</h3>
                      {member.status === 'PENDING' && (
                        <span className="text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Pendente
                        </span>
                      )}
                      {member.isMinor && (
                        <span className="text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                          Menor de 18 anos
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {member.memberships.length === 0 ? (
                        <span className="text-xs text-ink-muted italic">Sem departamento associado</span>
                      ) : (
                        member.memberships.map((m) => (
                          <span
                            key={m.id}
                            className="text-xs bg-bg px-2 py-0.5 rounded-control text-ink-muted font-medium border border-line"
                          >
                            {m.departmentName}
                            {m.functions.length > 0 &&
                              ` (${m.functions.map((f) => f.name).join(', ')})`}
                          </span>
                        ))
                      )}
                    </div>

                    {member.isMinor && member.guardianName && canViewContacts && (
                      <p className="text-xs text-ink-muted mt-1">
                        Responsável: <span className="font-medium text-ink">{member.guardianName}</span>
                        {member.guardianPhone && ` (${member.guardianPhone})`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Informações de contato (Proteção LGPD) */}
                <div className="text-xs text-ink-muted sm:text-right space-y-0.5 shrink-0">
                  {canViewContacts ? (
                    <>
                      <p className="font-medium text-ink">{member.phonePrimary || 'Sem telefone'}</p>
                      <p>{member.email}</p>
                      {member.whatsapp && member.whatsapp !== member.phonePrimary && (
                        <p className="text-[11px]">WhatsApp: {member.whatsapp}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="italic text-ink-muted text-[11px]">Contatos protegidos (apenas gestores)</p>
                      <p>{maskEmail(member.email)} • {maskPhoneNumber(member.phonePrimary)}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Novo Voluntário */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-surface border border-line max-w-lg w-full p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-ink">Novo Voluntário</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="text-ink-muted hover:text-ink text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="ex: João da Silva"
                  className="w-full px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="joao@exemplo.com"
                  className="w-full px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase mb-1">
                    Telefone Principal (+55...)
                  </label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="+5511999998888"
                    className="w-full px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase mb-1">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="text"
                    value={createWhatsapp}
                    onChange={(e) => setCreateWhatsapp(e.target.value)}
                    placeholder="+5511999998888"
                    className="w-full px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Departamento Inicial
                </label>
                <select
                  value={createDeptId}
                  onChange={(e) => {
                    setCreateDeptId(e.target.value);
                    setCreateFunctionIds([]);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-control border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Nenhum departamento (geral)</option>
                  {assignableDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {createDeptId && currentDeptFunctions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase mb-1.5">
                    Funções no Departamento
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-bg p-3 rounded-control border border-line max-h-36 overflow-y-auto">
                    {currentDeptFunctions.map((func) => (
                      <label key={func.id} className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createFunctionIds.includes(func.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateFunctionIds([...createFunctionIds, func.id]);
                            } else {
                              setCreateFunctionIds(createFunctionIds.filter((id) => id !== func.id));
                            }
                          }}
                          className="rounded border-line text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{func.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Proteção LGPD: Voluntário Menor de Idade */}
              <div className="bg-bg/60 p-3.5 rounded-control border border-line space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createIsMinor}
                    onChange={(e) => setCreateIsMinor(e.target.checked)}
                    className="rounded border-line text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-ink">
                    Voluntário menor de 18 anos
                  </span>
                </label>

                {createIsMinor && (
                  <div className="space-y-3 pt-2 border-t border-line text-xs">
                    <p className="text-ink-muted">
                      Em conformidade com a LGPD, o cadastro de voluntários menores de idade requer o registro dos dados de contato do responsável legal.
                    </p>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Nome do Responsável Legal *
                      </label>
                      <input
                        type="text"
                        required={createIsMinor}
                        value={createGuardianName}
                        onChange={(e) => setCreateGuardianName(e.target.value)}
                        placeholder="Nome do pai, mãe ou responsável legal"
                        className="w-full px-3 py-2 rounded-control border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        Telefone do Responsável Legal (+55...) *
                      </label>
                      <input
                        type="text"
                        required={createIsMinor}
                        value={createGuardianPhone}
                        onChange={(e) => setCreateGuardianPhone(e.target.value)}
                        placeholder="+5511999998888"
                        className="w-full px-3 py-2 rounded-control border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase mb-1">
                  Status Inicial
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="createStatus"
                      value="ACTIVE"
                      checked={createStatus === 'ACTIVE'}
                      onChange={() => setCreateStatus('ACTIVE')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Ativo (Pronto para escalas)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="createStatus"
                      value="PENDING"
                      checked={createStatus === 'PENDING'}
                      onChange={() => setCreateStatus('PENDING')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Pendente de Aprovação</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 border border-line text-ink rounded-control hover:bg-bg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-control hover:opacity-95 text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Cadastrar Voluntário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar Planilha */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-surface border border-line max-w-2xl w-full p-6 space-y-5 shadow-xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display text-ink">Importar Voluntários por Planilha</h2>
              <button
                type="button"
                onClick={closeImportModal}
                className="text-ink-muted hover:text-ink text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Sucesso após conclusão */}
            {importSuccessResult ? (
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-ink">Importação Finalizada!</h3>
                <div className="text-sm text-ink-muted space-y-1">
                  <p><strong>{importSuccessResult.created}</strong> novo(s) voluntário(s) cadastrado(s).</p>
                  <p><strong>{importSuccessResult.updated}</strong> voluntário(s) atualizado(s).</p>
                  <p><strong>{importSuccessResult.skipped}</strong> registro(s) mantido(s) sem alterações.</p>
                  {importSuccessResult.errors.length > 0 && (
                    <p className="text-amber-600">
                      {importSuccessResult.errors.length} erro(s) encontrados durante a gravação.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={closeImportModal}
                  className="px-5 py-2.5 bg-primary text-white rounded-control font-semibold text-sm hover:opacity-95 transition"
                >
                  Fechar
                </button>
              </div>
            ) : !importPreview ? (
              /* Passo 1: Seleção de Arquivo */
              <form onSubmit={handlePreviewImport} className="space-y-4">
                <div className="border-2 border-dashed border-line hover:border-primary rounded-surface p-6 text-center transition">
                  <input
                    type="file"
                    id="spreadsheetFile"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="spreadsheetFile" className="cursor-pointer block space-y-2">
                    <span className="text-3xl block">📊</span>
                    <span className="text-sm font-medium text-ink block">
                      {importFile ? importFile.name : 'Clique para selecionar ou arraste o arquivo CSV ou Excel'}
                    </span>
                    <span className="text-xs text-ink-muted block">
                      Formatos aceitos: .csv ou .xlsx (máximo 5 MB e 1000 linhas)
                    </span>
                  </label>
                </div>

                <div className="bg-bg/60 p-4 rounded-control border border-line text-xs text-ink-muted space-y-1.5">
                  <p className="font-semibold text-ink">Colunas aceitas na planilha:</p>
                  <p>• <strong>Nome</strong>: Nome completo do voluntário (obrigatório)</p>
                  <p>• <strong>E-mail</strong>: E-mail para contato e login (obrigatório)</p>
                  <p>• <strong>Telefone</strong> / <strong>WhatsApp</strong>: Formato internacional (+55...)</p>
                  <p>• <strong>Departamento</strong> / <strong>Função</strong>: Nome exato conforme cadastrado</p>
                  <p>• <strong>Menor</strong>: &quot;Sim&quot; ou &quot;Não&quot; (se sim, preencher <strong>Responsável</strong> e <strong>Telefone do Responsável</strong>)</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={closeImportModal}
                    className="px-4 py-2 border border-line text-ink rounded-control hover:bg-bg text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || loading}
                    className="px-4 py-2 bg-primary text-white rounded-control hover:opacity-95 text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Analisando arquivo...' : 'Analisar e Ver Prévia'}
                  </button>
                </div>
              </form>
            ) : (
              /* Passo 2: Prévia e Validação */
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-bg p-3 rounded-control border border-line">
                    <span className="text-xs text-ink-muted block">Total de Linhas</span>
                    <span className="text-lg font-bold text-ink">{importPreview.totalRows}</span>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded-control border border-green-500/20">
                    <span className="text-xs text-green-700 dark:text-green-300 block">Válidas</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                      {importPreview.validCount}
                    </span>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-control border border-amber-500/20">
                    <span className="text-xs text-amber-700 dark:text-amber-300 block">Já Cadastrados</span>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {importPreview.duplicateCount}
                    </span>
                  </div>
                  <div className="bg-red-500/10 p-3 rounded-control border border-red-500/20">
                    <span className="text-xs text-red-700 dark:text-red-300 block">Inválidas</span>
                    <span className="text-lg font-bold text-red-700 dark:text-red-300">
                      {importPreview.invalidCount}
                    </span>
                  </div>
                </div>

                {/* Avisos de linhas com erro */}
                {importPreview.invalidCount > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-control text-xs text-red-700 dark:text-red-300 max-h-28 overflow-y-auto space-y-1">
                    <p className="font-semibold">Linhas com erro que serão ignoradas:</p>
                    {importPreview.invalidRows.map((inv) => (
                      <p key={inv.index}>
                        • Linha {inv.index}: {inv.errors.join(', ')}
                      </p>
                    ))}
                  </div>
                )}

                {/* Opções de Importação */}
                <div className="bg-bg p-3.5 rounded-control border border-line space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-semibold text-ink">Status dos novos voluntários:</label>
                    <div className="flex gap-3">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importDefaultStatus"
                          value="ACTIVE"
                          checked={importDefaultStatus === 'ACTIVE'}
                          onChange={() => setImportDefaultStatus('ACTIVE')}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-ink">Ativo</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="importDefaultStatus"
                          value="PENDING"
                          checked={importDefaultStatus === 'PENDING'}
                          onChange={() => setImportDefaultStatus('PENDING')}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-ink">Pendente</span>
                      </label>
                    </div>
                  </div>

                  {importPreview.duplicateCount > 0 && (
                    <label className="flex items-center space-x-2 pt-2 border-t border-line cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importUpdateExisting}
                        onChange={(e) => setImportUpdateExisting(e.target.checked)}
                        className="rounded border-line text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-ink">
                        Atualizar dados dos {importPreview.duplicateCount} voluntários já existentes (telefone, WhatsApp, etc.)
                      </span>
                    </label>
                  )}
                </div>

                {/* Tabela de Amostra das Linhas Válidas */}
                <div className="border border-line rounded-control overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-bg border-b border-line text-ink-muted">
                      <tr>
                        <th className="p-2">Nome</th>
                        <th className="p-2">E-mail</th>
                        <th className="p-2">Depto / Função</th>
                        <th className="p-2 text-right">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {importPreview.validRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-bg/40">
                          <td className="p-2 font-medium text-ink">
                            {row.name}
                            {row.isMinor && (
                              <span className="ml-1 text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                                Menor
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-ink-muted">{row.email}</td>
                          <td className="p-2 text-ink-muted">
                            {row.departmentName || '-'}{' '}
                            {row.functionName ? `(${row.functionName})` : ''}
                          </td>
                          <td className="p-2 text-right">
                            {row.isExisting ? (
                              <span className="text-amber-600 font-medium">Existente</span>
                            ) : (
                              <span className="text-green-600 font-medium">Novo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="px-3 py-1.5 border border-line text-ink rounded-control hover:bg-bg text-xs font-medium"
                  >
                    ← Trocar Arquivo
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeImportModal}
                      className="px-3.5 py-2 border border-line text-ink rounded-control hover:bg-bg text-xs font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={loading || importPreview.validCount === 0}
                      onClick={handleConfirmImport}
                      className="px-4 py-2 bg-primary text-white rounded-control hover:opacity-95 text-xs font-semibold disabled:opacity-50"
                    >
                      {loading
                        ? 'Gravando no banco...'
                        : `Confirmar e Gravar ${importPreview.validCount} Voluntário(s)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
