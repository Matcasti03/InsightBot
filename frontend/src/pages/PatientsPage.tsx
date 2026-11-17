import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Copy,
  FileText,
  Gamepad2,
  Loader2,
  MapPin,
  Phone,
  Search,
  UserPlus,
  Users
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { ExamStatusBadge, ReportStatusBadge } from '../components/StatusBadges';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../lib/api';
import { cn, formatCpf, formatDate } from '../lib/utils';
import type { Exam, HealthUnit, PatientSummary } from '../types';

interface PatientDetailResponse {
  patient: PatientSummary;
  exams: Exam[];
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  cpf: '',
  phone: '',
  birth_date: '',
  health_unit: '',
  password: ''
};

export default function PatientsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const autoOpenedRef = useRef(false);

  const { data: patients, loading, error, refetch } = useAsyncData<PatientSummary[]>(
    () =>
      api.get<PatientSummary[]>(
        `/patients${debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : ''}`
      ),
    [debouncedSearch]
  );
  const { data: healthUnits } = useAsyncData<HealthUnit[]>(() => api.get<HealthUnit[]>('/health-units'), []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (searchParams.get('new') === '1' && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setForm({ ...EMPTY_FORM, health_unit: profile?.health_unit ?? '' });
      setCreatedCredentials(null);
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, profile?.health_unit]);

  useEffect(() => {
    if (!selectedPatientId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    api
      .get<PatientDetailResponse>(`/patients/${selectedPatientId}`)
      .then((response) => {
        if (active) setDetail(response);
      })
      .catch((fetchError) => {
        if (active) {
          toast.error(
            'Falha ao carregar paciente',
            fetchError instanceof Error ? fetchError.message : 'Tente novamente.'
          );
          setSelectedPatientId(null);
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPatientId, toast]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, health_unit: profile?.health_unit ?? '' });
    setCreatedCredentials(null);
    setCopied(false);
    setCreateOpen(true);
  };

  const updateForm = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await api.post<{
        patient: PatientSummary;
        temporary_password?: string;
      }>('/patients', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        cpf: form.cpf.trim() || null,
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        health_unit: form.health_unit.trim() || null,
        password: form.password.trim() || undefined
      });
      setCreatedCredentials({
        email: response.patient.email,
        password: response.temporary_password
      });
      toast.success('Paciente cadastrado', 'A conta de acesso foi criada com sucesso.');
      refetch();
    } catch (createError) {
      toast.error(
        'Nao foi possivel cadastrar',
        createError instanceof Error ? createError.message : 'Tente novamente.'
      );
    } finally {
      setCreating(false);
    }
  };

  const copyPassword = async () => {
    if (!createdCredentials?.password) return;
    try {
      await navigator.clipboard.writeText(createdCredentials.password);
      setCopied(true);
      toast.success('Senha copiada', 'Compartilhe com o paciente por um canal seguro.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Falha ao copiar', 'Copie a senha manualmente.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro, prontuario e acompanhamento regional"
        icon={Users}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Novo paciente
          </button>
        }
      />

      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="input pl-10"
              aria-label="Buscar pacientes"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="badge bg-primary/10 text-primary">
              {patients?.length ?? 0} pacientes
            </span>
            {profile?.health_unit && (
              <span className="badge bg-panel text-muted">
                <MapPin className="h-3.5 w-3.5" /> {profile.health_unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="card p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold">Falha ao carregar pacientes</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
          <button type="button" onClick={refetch} className="btn-secondary mt-4">
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && patients && patients.length === 0 && (
        <div className="card p-6">
          <EmptyState
            icon={Users}
            title={debouncedSearch ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={
              debouncedSearch
                ? 'Tente buscar por outro nome ou e-mail.'
                : 'Cadastre o primeiro paciente para iniciar o acompanhamento.'
            }
            action={
              !debouncedSearch ? (
                <button type="button" onClick={openCreate} className="btn-primary">
                  <UserPlus className="h-4 w-4" /> Cadastrar paciente
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && patients && patients.length > 0 && (
        <>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/60 bg-panel/40 text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="cursor-pointer border-b border-line/40 transition hover:bg-panel/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
                          {patient.full_name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-main">{patient.full_name}</p>
                          <p className="truncate text-[11px] text-muted">{patient.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {patient.cpf_masked ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{patient.health_unit ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{patient.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDate(patient.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="ml-auto h-4 w-4 text-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => setSelectedPatientId(patient.id)}
                className="card card-hover flex items-center gap-3 p-4 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                  {patient.full_name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-main">{patient.full_name}</p>
                  <p className="truncate text-[11px] text-muted">{patient.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted">
                    <span className="badge bg-panel">{patient.cpf_masked ?? 'CPF nao informado'}</span>
                    {patient.health_unit && (
                      <span className="badge bg-panel">{patient.health_unit}</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreatedCredentials(null);
        }}
        title={createdCredentials ? 'Paciente cadastrado' : 'Novo paciente'}
        description={
          createdCredentials
            ? 'Compartilhe as credenciais iniciais de acesso com o paciente.'
            : 'Preencha os dados para criar a conta e o prontuario.'
        }
        size="lg"
        footer={
          createdCredentials ? (
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreatedCredentials(null);
              }}
              className="btn-primary"
            >
              Concluir
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="submit"
                form="create-patient-form"
                disabled={creating}
                className="btn-primary"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Cadastrar paciente
              </button>
            </>
          )
        }
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-main">Conta criada com sucesso</p>
                <p className="text-xs text-muted">
                  O paciente ja pode acessar com o e-mail {createdCredentials.email}.
                </p>
              </div>
            </div>
            {createdCredentials.password && (
              <div className="rounded-xl border border-line/60 bg-panel/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Senha temporaria
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm font-bold text-main">
                    {createdCredentials.password}
                  </code>
                  <button type="button" onClick={copyPassword} className="btn-secondary px-3">
                    {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Por seguranca, a senha nao sera exibida novamente. Registre-a antes de fechar.
                </p>
              </div>
            )}
          </div>
        ) : (
          <form id="create-patient-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="patient-name" className="label">
                  Nome completo
                </label>
                <input
                  id="patient-name"
                  required
                  value={form.full_name}
                  onChange={updateForm('full_name')}
                  className="input"
                  placeholder="Nome completo do paciente"
                />
              </div>
              <div>
                <label htmlFor="patient-email" className="label">
                  E-mail
                </label>
                <input
                  id="patient-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={updateForm('email')}
                  className="input"
                  placeholder="paciente@email.com"
                />
              </div>
              <div>
                <label htmlFor="patient-cpf" className="label">
                  CPF
                </label>
                <input
                  id="patient-cpf"
                  value={form.cpf}
                  onChange={updateForm('cpf')}
                  className="input"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label htmlFor="patient-phone" className="label">
                  Telefone
                </label>
                <input
                  id="patient-phone"
                  value={form.phone}
                  onChange={updateForm('phone')}
                  className="input"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label htmlFor="patient-birth" className="label">
                  Data de nascimento
                </label>
                <input
                  id="patient-birth"
                  type="date"
                  value={form.birth_date}
                  onChange={updateForm('birth_date')}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="patient-unit" className="label">
                  Unidade de saude
                </label>
                <input
                  id="patient-unit"
                  list="health-units-options"
                  value={form.health_unit}
                  onChange={updateForm('health_unit')}
                  className="input"
                  placeholder="UBS ou clinica"
                />
                <datalist id="health-units-options">
                  {healthUnits?.map((unit) => (
                    <option key={unit.id} value={unit.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="patient-password" className="label">
                  Senha inicial (opcional)
                </label>
                <input
                  id="patient-password"
                  type="password"
                  value={form.password}
                  onChange={updateForm('password')}
                  className="input"
                  placeholder="Gerada automaticamente se vazio"
                  minLength={8}
                />
              </div>
            </div>
            <p className="rounded-xl bg-panel/40 p-3 text-[11px] leading-relaxed text-muted">
              Os dados sensiveis sao protegidos por politicas de acesso (RLS) e o CPF e mascarado
              nas listagens, em conformidade com a LGPD.
            </p>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(selectedPatientId)}
        onClose={() => setSelectedPatientId(null)}
        title="Detalhes do paciente"
        description={detail?.patient.full_name}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setSelectedPatientId(null)} className="btn-secondary">
              Fechar
            </button>
            {detail?.patient && (
              <Link to={`/console?patient=${detail.patient.id}`} className="btn-primary">
                <Gamepad2 className="h-4 w-4" /> Iniciar console
              </Link>
            )}
          </>
        }
      >
        {detailLoading && (
          <div className="space-y-3">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        )}

        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                {detail.patient.full_name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <p className="text-lg font-bold text-main">{detail.patient.full_name}</p>
                <p className="text-xs text-muted">{detail.patient.email}</p>
                <span className="badge mt-1.5 bg-primary/10 text-primary">Paciente</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ['CPF', formatCpf(detail.patient.cpf)],
                ['Telefone', detail.patient.phone ?? '—'],
                ['Nascimento', detail.patient.birth_date ? formatDate(detail.patient.birth_date) : '—'],
                ['Unidade', detail.patient.health_unit ?? '—'],
                ['Cadastro', formatDate(detail.patient.created_at)],
                ['Exames', String(detail.exams.length)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line/60 bg-panel/30 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-main">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="section-title">Exames e laudos</p>
                <Link
                  to="/exames"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Central de laudos
                </Link>
              </div>
              {detail.exams.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nenhum exame registrado"
                  description="Inicie um exame pelo console para este paciente."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {detail.exams.map((exam) => (
                    <div
                      key={exam.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-panel/25 p-3',
                        exam.status === 'em_andamento' && 'border-accent/30 bg-accent/5'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-main">
                          {exam.capsule_id} · {exam.health_unit ?? 'Sem unidade'}
                        </p>
                        <p className="text-[10px] text-muted">
                          {formatDate(exam.created_at)} · {exam.report_status === 'concluido' ? 'Laudo disponivel' : 'Laudo pendente'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ExamStatusBadge status={exam.status} />
                        <ReportStatusBadge status={exam.report_status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={`tel:${detail.patient.phone ?? ''}`}
                className={cn('btn-secondary justify-start', !detail.patient.phone && 'pointer-events-none opacity-50')}
              >
                <Phone className="h-4 w-4 text-primary" /> Ligar para o paciente
              </a>
              <Link to="/exames" className="btn-secondary justify-start">
                <FileText className="h-4 w-4 text-primary" /> Ver laudos e amostras
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
