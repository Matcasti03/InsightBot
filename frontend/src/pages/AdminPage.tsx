import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  Check,
  ClipboardList,
  Copy,
  History,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../lib/api';
import { cn, formatDateTime, roleLabel } from '../lib/utils';
import type { AuditLog, HealthUnit, Profile, Role } from '../types';

type TabKey = 'usuarios' | 'unidades' | 'auditoria';
type UnitType = 'ubs' | 'clinica' | 'hospital';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'usuarios', label: 'Usuarios', icon: Users },
  { key: 'unidades', label: 'Unidades', icon: Building2 },
  { key: 'auditoria', label: 'Auditoria', icon: History }
];

const ROLE_OPTIONS: Role[] = ['superadmin', 'medico', 'operador_ubs', 'paciente'];

const ACTION_LABELS: Record<string, string> = {
  'biopsy.trigger': 'Biopsia acionada',
  'biopsy.human_validation': 'Validacao de biopsia',
  'biopsy.update': 'Amostra atualizada',
  'exam.create': 'Exame criado',
  'exam.update': 'Exame atualizado',
  'exam.report_update': 'Laudo atualizado',
  'patient.create': 'Paciente cadastrado',
  'patient.update': 'Paciente atualizado',
  'profile.update': 'Perfil atualizado',
  'profile.avatar_update': 'Foto atualizada',
  'admin.user_create': 'Usuario criado',
  'admin.user_update': 'Usuario atualizado',
  'admin.health_unit_create': 'Unidade criada',
  'admin.health_unit_update': 'Unidade atualizada'
};

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  ubs: 'UBS',
  clinica: 'Clinica',
  hospital: 'Hospital'
};

const EMPTY_USER_FORM = {
  full_name: '',
  email: '',
  role: 'medico' as Exclude<Role, 'paciente'>,
  health_unit: '',
  professional_register: '',
  password: ''
};

const EMPTY_UNIT_FORM = {
  name: '',
  city: '',
  state: '',
  type: 'ubs' as UnitType
};

export default function AdminPage() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('usuarios');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT_FORM);
  const [creatingUnit, setCreatingUnit] = useState(false);

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useAsyncData<Profile[]>(() => api.get<Profile[]>('/admin/users'), []);
  const {
    data: units,
    loading: unitsLoading,
    error: unitsError,
    refetch: refetchUnits
  } = useAsyncData<HealthUnit[]>(() => api.get<HealthUnit[]>('/admin/health-units'), []);
  const {
    data: auditLogs,
    loading: auditLoading,
    error: auditError,
    refetch: refetchAudit
  } = useAsyncData<AuditLog[]>(() => api.get<AuditLog[]>('/admin/audit'), []);

  const stats = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      doctors: list.filter((user) => user.role === 'medico').length,
      operators: list.filter((user) => user.role === 'operador_ubs').length,
      activeUnits: (units ?? []).filter((unit) => unit.active).length
    };
  }, [users, units]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users ?? [];
    return (users ?? []).filter(
      (user) =>
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.health_unit ?? '').toLowerCase().includes(term)
    );
  }, [users, userSearch]);

  const filteredAudit = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    if (!term) return auditLogs ?? [];
    return (auditLogs ?? []).filter(
      (log) =>
        (ACTION_LABELS[log.action] ?? log.action).toLowerCase().includes(term) ||
        (log.actor_email ?? '').toLowerCase().includes(term) ||
        log.entity.toLowerCase().includes(term)
    );
  }, [auditLogs, auditSearch]);

  const updateUser = async (user: Profile, payload: Partial<Profile>) => {
    setUpdatingUserId(user.id);
    try {
      const updated = await api.patch<Profile>(`/admin/users/${user.id}`, payload);
      refetchUsers();
      refetchAudit();
      if (updated.id === profile?.id) updateProfile(updated);
      toast.success('Usuario atualizado', 'As permissoes foram salvas com sucesso.');
    } catch (error) {
      toast.error(
        'Falha ao atualizar usuario',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openUserModal = () => {
    setUserForm({ ...EMPTY_USER_FORM });
    setCreatedUser(null);
    setCopied(false);
    setUserModalOpen(true);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingUser(true);
    try {
      const response = await api.post<{ user: Profile; temporary_password?: string }>(
        '/admin/users',
        {
          full_name: userForm.full_name.trim(),
          email: userForm.email.trim(),
          role: userForm.role,
          health_unit: userForm.health_unit.trim() || null,
          professional_register: userForm.professional_register.trim() || null,
          password: userForm.password.trim() || undefined
        }
      );
      setCreatedUser({
        email: response.user.email,
        password: response.temporary_password
      });
      refetchUsers();
      refetchAudit();
      toast.success('Usuario criado', 'A conta profissional foi liberada com sucesso.');
    } catch (error) {
      toast.error(
        'Falha ao criar usuario',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setCreatingUser(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdUser?.password) return;
    try {
      await navigator.clipboard.writeText(createdUser.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
      toast.success('Senha copiada', 'Compartilhe por um canal seguro.');
    } catch {
      toast.error('Falha ao copiar', 'Copie a senha manualmente.');
    }
  };

  const toggleUnit = async (unit: HealthUnit) => {
    setUpdatingUnitId(unit.id);
    try {
      await api.patch(`/admin/health-units/${unit.id}`, { active: !unit.active });
      refetchUnits();
      refetchAudit();
      toast.success(
        unit.active ? 'Unidade desativada' : 'Unidade reativada',
        `A unidade ${unit.name} foi atualizada.`
      );
    } catch (error) {
      toast.error(
        'Falha ao atualizar unidade',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const handleCreateUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingUnit(true);
    try {
      await api.post('/admin/health-units', {
        name: unitForm.name.trim(),
        city: unitForm.city.trim(),
        state: unitForm.state.trim().toUpperCase(),
        type: unitForm.type
      });
      setUnitModalOpen(false);
      setUnitForm(EMPTY_UNIT_FORM);
      refetchUnits();
      refetchAudit();
      toast.success('Unidade cadastrada', 'A unidade ja esta disponivel para vinculo.');
    } catch (error) {
      toast.error(
        'Falha ao cadastrar unidade',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setCreatingUnit(false);
    }
  };

  const headerAction =
    tab === 'usuarios' ? (
      <button type="button" onClick={openUserModal} className="btn-primary">
        <UserPlus className="h-4 w-4" /> Novo usuario
      </button>
    ) : tab === 'unidades' ? (
      <button type="button" onClick={() => setUnitModalOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Nova unidade
      </button>
    ) : (
      <button type="button" onClick={refetchAudit} className="btn-secondary">
        <History className="h-4 w-4" /> Atualizar logs
      </button>
    );

  return (
    <div>
      <PageHeader
        title="Painel administrativo"
        subtitle="Governanca de usuarios, unidades de saude e auditoria LGPD"
        icon={ShieldCheck}
        actions={headerAction}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Usuarios', value: stats.total, icon: Users, tone: 'text-primary bg-primary/10' },
          { label: 'Medicos', value: stats.doctors, icon: Stethoscope, tone: 'text-accent bg-accent/10' },
          { label: 'Operadores', value: stats.operators, icon: Activity, tone: 'text-warning bg-warning/10' },
          { label: 'Unidades ativas', value: stats.activeUnits, icon: Building2, tone: 'text-primary bg-primary/10' }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-main">{stat.value}</p>
                </div>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', stat.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-xl border border-line/60 bg-surface/70 p-1.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                tab === item.key ? 'bg-primary text-white shadow' : 'text-muted hover:text-main'
              )}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'usuarios' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Usuarios cadastrados</p>
              <p className="text-xs text-muted">Altere perfis, unidades e status de acesso</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Buscar usuario..."
                className="input pl-10"
                aria-label="Buscar usuarios"
              />
            </div>
          </div>

          {usersLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-12 w-full" />
              ))}
            </div>
          )}

          {!usersLoading && usersError && (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-danger" />
              <p className="mt-2 text-sm font-semibold">Falha ao carregar usuarios</p>
              <p className="mt-1 text-xs text-muted">{usersError}</p>
              <button type="button" onClick={refetchUsers} className="btn-secondary mt-4">
                Tentar novamente
              </button>
            </div>
          )}

          {!usersLoading && !usersError && filteredUsers.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="Nenhum usuario encontrado"
                description="Ajuste a busca ou crie um novo usuario profissional."
                compact
              />
            </div>
          )}

          {!usersLoading && filteredUsers.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line/60 bg-panel/40 text-[10px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Perfil</th>
                      <th className="px-4 py-3">Unidade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const isSelf = user.id === profile?.id;
                      return (
                        <tr key={user.id} className="border-b border-line/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                                {user.full_name
                                  .split(' ')
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-main">
                                  {user.full_name}
                                  {isSelf && (
                                    <span className="ml-1.5 badge bg-primary/10 text-primary">voce</span>
                                  )}
                                </p>
                                <p className="truncate text-[11px] text-muted">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.role}
                              disabled={isSelf || updatingUserId === user.id}
                              onChange={(event) =>
                                updateUser(user, { role: event.target.value as Role })
                              }
                              className="select w-auto min-w-[140px] py-1.5 text-xs disabled:opacity-60"
                              aria-label={`Perfil de ${user.full_name}`}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {roleLabel(role)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            {user.health_unit ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.status}
                              disabled={isSelf || updatingUserId === user.id}
                              onChange={(event) =>
                                updateUser(user, {
                                  status: event.target.value as Profile['status']
                                })
                              }
                              className="select w-auto min-w-[110px] py-1.5 text-xs disabled:opacity-60"
                              aria-label={`Status de ${user.full_name}`}
                            >
                              <option value="ativo">Ativo</option>
                              <option value="pendente">Pendente</option>
                              <option value="inativo">Inativo</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            {formatDateTime(user.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === profile?.id;
                  return (
                    <div key={user.id} className="rounded-xl border border-line/60 bg-panel/25 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                          {user.full_name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-main">{user.full_name}</p>
                          <p className="truncate text-[11px] text-muted">{user.email}</p>
                        </div>
                        {isSelf && (
                          <span className="badge bg-primary/10 text-primary">voce</span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                            Perfil
                          </p>
                          <select
                            value={user.role}
                            disabled={isSelf || updatingUserId === user.id}
                            onChange={(event) =>
                              updateUser(user, { role: event.target.value as Role })
                            }
                            className="select py-1.5 text-xs disabled:opacity-60"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                            Status
                          </p>
                          <select
                            value={user.status}
                            disabled={isSelf || updatingUserId === user.id}
                            onChange={(event) =>
                              updateUser(user, {
                                status: event.target.value as Profile['status']
                              })
                            }
                            className="select py-1.5 text-xs disabled:opacity-60"
                          >
                            <option value="ativo">Ativo</option>
                            <option value="pendente">Pendente</option>
                            <option value="inativo">Inativo</option>
                          </select>
                        </div>
                      </div>
                      <p className="mt-2 truncate text-[10px] text-muted">
                        {user.health_unit ?? 'Sem unidade'} · criado em {formatDateTime(user.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'unidades' && (
        <div>
          {unitsLoading && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card h-32 p-4">
                  <div className="skeleton h-full w-full" />
                </div>
              ))}
            </div>
          )}

          {!unitsLoading && unitsError && (
            <div className="card p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-danger" />
              <p className="mt-2 text-sm font-semibold">Falha ao carregar unidades</p>
              <p className="mt-1 text-xs text-muted">{unitsError}</p>
              <button type="button" onClick={refetchUnits} className="btn-secondary mt-4">
                Tentar novamente
              </button>
            </div>
          )}

          {!unitsLoading && units && units.length === 0 && (
            <div className="card p-6">
              <EmptyState
                icon={Building2}
                title="Nenhuma unidade cadastrada"
                description="Cadastre UBSs, clinicas e hospitais parceiros."
                action={
                  <button type="button" onClick={() => setUnitModalOpen(true)} className="btn-primary">
                    <Plus className="h-4 w-4" /> Nova unidade
                  </button>
                }
              />
            </div>
          )}

          {!unitsLoading && units && units.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => (
                <div key={unit.id} className="card card-hover p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        'badge',
                        unit.active
                          ? 'bg-accent/10 text-accent'
                          : 'bg-danger/10 text-danger'
                      )}
                    >
                      {unit.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-main">{unit.name}</p>
                  <p className="text-[11px] text-muted">
                    {unit.city} · {unit.state}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="badge bg-panel text-muted">
                      {UNIT_TYPE_LABELS[unit.type]}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit)}
                      disabled={updatingUnitId === unit.id}
                      className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      {updatingUnitId === unit.id
                        ? 'Atualizando...'
                        : unit.active
                          ? 'Desativar'
                          : 'Reativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Trilha de auditoria</p>
              <p className="text-xs text-muted">
                Acoes criticas registradas para conformidade com a LGPD
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={auditSearch}
                onChange={(event) => setAuditSearch(event.target.value)}
                placeholder="Buscar acao ou responsavel..."
                className="input pl-10"
                aria-label="Buscar logs de auditoria"
              />
            </div>
          </div>

          {auditLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-14 w-full" />
              ))}
            </div>
          )}

          {!auditLoading && auditError && (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-danger" />
              <p className="mt-2 text-sm font-semibold">Falha ao carregar auditoria</p>
              <p className="mt-1 text-xs text-muted">{auditError}</p>
              <button type="button" onClick={refetchAudit} className="btn-secondary mt-4">
                Tentar novamente
              </button>
            </div>
          )}

          {!auditLoading && !auditError && filteredAudit.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={History}
                title="Nenhum evento encontrado"
                description="Acoes criticas aparecerao aqui automaticamente."
                compact
              />
            </div>
          )}

          {!auditLoading && filteredAudit.length > 0 && (
            <div className="divide-y divide-line/40">
              {filteredAudit.map((log) => {
                const critical = log.action.startsWith('biopsy') || log.action.includes('report');
                return (
                  <div key={log.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        critical ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {critical ? <SyringeIcon /> : <ClipboardList className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-main">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </p>
                        <span className={cn('badge', critical ? 'bg-danger/10 text-danger' : 'bg-panel text-muted')}>
                          {log.entity}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {log.actor_email ?? 'Sistema'} · {formatDateTime(log.created_at)}
                        {log.ip_address ? ` · IP ${log.ip_address}` : ''}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[10px] font-semibold text-primary">
                            Ver detalhes
                          </summary>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-panel/60 p-2 text-[10px] text-muted">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setCreatedUser(null);
        }}
        title={createdUser ? 'Usuario criado' : 'Novo usuario profissional'}
        description={
          createdUser
            ? 'Compartilhe as credenciais iniciais por um canal seguro.'
            : 'Crie contas para medicos e operadores de UBS.'
        }
        footer={
          createdUser ? (
            <button
              type="button"
              onClick={() => {
                setUserModalOpen(false);
                setCreatedUser(null);
              }}
              className="btn-primary"
            >
              Concluir
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setUserModalOpen(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={creatingUser}
                className="btn-primary"
              >
                {creatingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Criar usuario
              </button>
            </>
          )
        }
      >
        {createdUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">Conta profissional ativa</p>
                <p className="text-xs text-muted">{createdUser.email}</p>
              </div>
            </div>
            {createdUser.password && (
              <div className="rounded-xl border border-line/60 bg-panel/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Senha temporaria
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm font-bold text-main">
                    {createdUser.password}
                  </code>
                  <button type="button" onClick={copyCredentials} className="btn-secondary px-3">
                    {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="admin-user-name" className="label">
                  Nome completo
                </label>
                <input
                  id="admin-user-name"
                  required
                  value={userForm.full_name}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  className="input"
                  placeholder="Nome do profissional"
                />
              </div>
              <div>
                <label htmlFor="admin-user-email" className="label">
                  E-mail
                </label>
                <input
                  id="admin-user-email"
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="input"
                  placeholder="profissional@instituicao.com"
                />
              </div>
              <div>
                <label htmlFor="admin-user-role" className="label">
                  Perfil
                </label>
                <select
                  id="admin-user-role"
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      role: event.target.value as Exclude<Role, 'paciente'>
                    }))
                  }
                  className="select"
                >
                  <option value="medico">Medico</option>
                  <option value="operador_ubs">Operador UBS</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-user-unit" className="label">
                  Unidade de saude
                </label>
                <input
                  id="admin-user-unit"
                  list="admin-health-units"
                  value={userForm.health_unit}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, health_unit: event.target.value }))
                  }
                  className="input"
                  placeholder="UBS ou clinica"
                />
                <datalist id="admin-health-units">
                  {units?.map((unit) => (
                    <option key={unit.id} value={unit.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="admin-user-register" className="label">
                  Registro profissional
                </label>
                <input
                  id="admin-user-register"
                  value={userForm.professional_register}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      professional_register: event.target.value
                    }))
                  }
                  className="input"
                  placeholder="CRM, COREN..."
                />
              </div>
              <div>
                <label htmlFor="admin-user-password" className="label">
                  Senha inicial (opcional)
                </label>
                <input
                  id="admin-user-password"
                  type="password"
                  minLength={8}
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className="input"
                  placeholder="Gerada automaticamente se vazio"
                />
              </div>
            </div>
            <p className="rounded-xl bg-panel/40 p-3 text-[11px] leading-relaxed text-muted">
              Contas criadas aqui sao liberadas imediatamente com status ativo. O usuario deve
              alterar a senha apos o primeiro acesso.
            </p>
          </form>
        )}
      </Modal>

      <Modal
        open={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title="Nova unidade de saude"
        description="Cadastre UBSs, clinicas e hospitais parceiros da rede."
        footer={
          <>
            <button type="button" onClick={() => setUnitModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              form="create-unit-form"
              disabled={creatingUnit}
              className="btn-primary"
            >
              {creatingUnit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Cadastrar unidade
            </button>
          </>
        }
      >
        <form id="create-unit-form" onSubmit={handleCreateUnit} className="space-y-4">
          <div>
            <label htmlFor="unit-name" className="label">
              Nome da unidade
            </label>
            <input
              id="unit-name"
              required
              value={unitForm.name}
              onChange={(event) =>
                setUnitForm((current) => ({ ...current, name: event.target.value }))
              }
              className="input"
              placeholder="UBS Dr. Joao Mendes"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="unit-city" className="label">
                Cidade
              </label>
              <input
                id="unit-city"
                required
                value={unitForm.city}
                onChange={(event) =>
                  setUnitForm((current) => ({ ...current, city: event.target.value }))
                }
                className="input"
                placeholder="Sobral"
              />
            </div>
            <div>
              <label htmlFor="unit-state" className="label">
                UF
              </label>
              <input
                id="unit-state"
                required
                maxLength={2}
                value={unitForm.state}
                onChange={(event) =>
                  setUnitForm((current) => ({
                    ...current,
                    state: event.target.value.toUpperCase()
                  }))
                }
                className="input uppercase"
                placeholder="CE"
              />
            </div>
          </div>
          <div>
            <label htmlFor="unit-type" className="label">
              Tipo
            </label>
            <select
              id="unit-type"
              value={unitForm.type}
              onChange={(event) =>
                setUnitForm((current) => ({ ...current, type: event.target.value as UnitType }))
              }
              className="select"
            >
              <option value="ubs">UBS</option>
              <option value="clinica">Clinica</option>
              <option value="hospital">Hospital</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SyringeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </svg>
  );
}
