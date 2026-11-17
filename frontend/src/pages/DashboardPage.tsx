import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gamepad2,
  HeartPulse,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  UserPlus,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../lib/api';
import { useAsyncData } from '../hooks/useAsyncData';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime, greeting, roleLabel } from '../lib/utils';
import type { DashboardSummary, Exam } from '../types';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { ExamStatusBadge, ReportStatusBadge } from '../components/StatusBadges';
import PrepChecklist from '../components/PrepChecklist';
import EmptyState from '../components/EmptyState';
import { PageSkeleton } from '../components/Loading';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-xl">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-main">{payload[0]?.value} exames</p>
    </div>
  );
}

function ExamRow({ exam, patientView = false }: { exam: Exam; patientView?: boolean }) {
  const date = exam.status === 'agendado' ? exam.scheduled_at : exam.created_at;
  const title = patientView ? exam.health_unit ?? 'Unidade InSightBot' : exam.patient?.full_name ?? 'Paciente';
  const target = !patientView && exam.status === 'em_andamento' ? '/console' : '/exames';

  return (
    <Link
      to={target}
      className="group flex items-center gap-3 rounded-xl border border-line/50 bg-panel/25 p-3 transition hover:border-primary/30 hover:bg-panel/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ClipboardList className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-main">{title}</p>
        <p className="truncate text-[11px] text-muted">
          {exam.capsule_id} · {exam.status === 'agendado' ? 'Agendado para ' : ''}
          {formatDate(date)}
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <ExamStatusBadge status={exam.status} />
        <ReportStatusBadge status={exam.report_status} />
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data, loading, error, refetch } = useAsyncData<DashboardSummary>(
    () => api.get<DashboardSummary>('/dashboard'),
    []
  );

  if (loading) return <PageSkeleton />;

  if (error || !data || !profile) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">Nao foi possivel carregar o dashboard</p>
        <p className="max-w-sm text-xs text-muted">{error ?? 'Tente novamente em instantes.'}</p>
        <button type="button" onClick={refetch} className="btn-secondary mt-2">
          Tentar novamente
        </button>
      </div>
    );
  }

  const isPatient = profile.role === 'paciente';
  const firstName = profile.full_name.split(' ')[0];
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(new Date());
  const nextExam = data.upcoming_exams?.[0];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={`${today} · ${data.scope_label}`}
        actions={
          isPatient ? (
            <Link to="/exames" className="btn-primary">
              <FileText className="h-4 w-4" /> Meus exames
            </Link>
          ) : (
            <>
              <Link to="/pacientes?new=1" className="btn-secondary">
                <UserPlus className="h-4 w-4" /> Novo paciente
              </Link>
              <Link to="/console" className="btn-primary">
                <Gamepad2 className="h-4 w-4" /> Abrir console
              </Link>
            </>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="badge bg-primary/10 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel(profile.role)}
        </span>
        <span className="badge bg-panel text-muted">
          <MapPin className="h-3.5 w-3.5" /> {profile.health_unit ?? 'Rede InSightBot'}
        </span>
        {profile.role === 'superadmin' && (
          <span className="badge bg-accent/10 text-accent">
            <Users className="h-3.5 w-3.5" /> {data.metrics.users_total} usuarios cadastrados
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isPatient ? (
          <>
            <StatCard
              label="Meus exames"
              value={data.metrics.total_exams}
              hint={`${data.metrics.concluded} concluidos`}
              icon={ClipboardList}
              tone="primary"
              delay={0}
            />
            <StatCard
              label="Laudos disponiveis"
              value={data.metrics.reports_available}
              hint="Consulte o resultado no detalhe do exame"
              icon={FileText}
              tone="accent"
              delay={0.05}
            />
            <StatCard
              label="Em andamento"
              value={data.metrics.in_progress}
              hint="Acompanhamento em tempo real"
              icon={Activity}
              tone="warning"
              delay={0.1}
            />
            <StatCard
              label="Biopsias"
              value={data.metrics.biopsies_total}
              hint={`${data.metrics.biopsies_pending} aguardando resultado`}
              icon={HeartPulse}
              tone="danger"
              delay={0.15}
            />
          </>
        ) : (
          <>
            <StatCard
              label={profile.role === 'superadmin' ? 'Exames na rede' : 'Exames na unidade'}
              value={data.metrics.total_exams}
              hint={`${data.metrics.concluded} concluidos · ${data.metrics.patients_total} pacientes`}
              icon={ClipboardList}
              tone="primary"
              delay={0}
            />
            <StatCard
              label="Em andamento"
              value={data.metrics.in_progress}
              hint={`${data.metrics.active_capsules} capsulas ativas`}
              icon={Radio}
              tone="accent"
              delay={0.05}
            />
            <StatCard
              label="Laudos pendentes"
              value={data.metrics.pending_reports}
              hint="Fila de analise medica"
              icon={FileText}
              tone="warning"
              delay={0.1}
            />
            <StatCard
              label="Deslocamentos evitados"
              value={data.metrics.avoided_travels}
              hint="Pacientes atendidos na propria regiao"
              icon={Route}
              tone="accent"
              delay={0.15}
            />
          </>
        )}
      </div>

      {isPatient ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="card overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
                <div>
                  <p className="section-title">Proximo exame</p>
                  <p className="text-xs text-muted">Informacoes do seu agendamento</p>
                </div>
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              {nextExam ? (
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                      <span className="text-2xl font-extrabold leading-none">
                        {new Date(nextExam.scheduled_at ?? nextExam.created_at).getDate()}
                      </span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest">
                        {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                          .format(new Date(nextExam.scheduled_at ?? nextExam.created_at))
                          .replace('.', '')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ExamStatusBadge status={nextExam.status} />
                        <ReportStatusBadge status={nextExam.report_status} />
                      </div>
                      <p className="mt-2 text-sm font-bold text-main">
                        {nextExam.health_unit ?? 'Unidade InSightBot'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDateTime(nextExam.scheduled_at)} · Capsula {nextExam.capsule_id}
                      </p>
                    </div>
                    <Link to="/exames" className="btn-secondary shrink-0">
                      Detalhes <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    Siga o checklist de preparo e chegue com 30 minutos de antecedencia. Em caso de
                    duvidas, procure a equipe da sua UBS.
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState
                    icon={CalendarClock}
                    title="Nenhum exame agendado"
                    description="Quando a equipe agendar seu exame, ele aparecera aqui com todas as orientacoes."
                    compact
                  />
                </div>
              )}
            </motion.div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="section-title">Historico recente</p>
                  <p className="text-xs text-muted">Seus ultimos exames e laudos</p>
                </div>
                <Link to="/exames" className="text-xs font-semibold text-primary hover:underline">
                  Ver todos
                </Link>
              </div>
              {data.recent_exams.length ? (
                <div className="space-y-2">
                  {data.recent_exams.slice(0, 5).map((exam) => (
                    <ExamRow key={exam.id} exam={exam} patientView />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum exame registrado"
                  description="Seu historico aparecera aqui apos o primeiro atendimento."
                  compact
                />
              )}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <PrepChecklist />
            <div className="card p-5">
              <p className="section-title">Como funciona</p>
              <div className="mt-4 space-y-4">
                {[
                  {
                    step: '01',
                    title: 'Ingestao da capsula',
                    description: 'Voce engole uma capsula do tamanho de uma pilula, sem sedacao.'
                  },
                  {
                    step: '02',
                    title: 'Exame indolor',
                    description: 'A capsula percorre o sistema digestivo e transmite imagens em HD.'
                  },
                  {
                    step: '03',
                    title: 'Laudo especializado',
                    description: 'O medico analisa as imagens e disponibiliza o resultado no app.'
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-extrabold text-primary">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-main">{item.title}</p>
                      <p className="text-xs leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="card p-5 lg:col-span-2"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="section-title">Fluxo de exames</p>
                  <p className="text-xs text-muted">Ultimos 6 meses na sua area de cobertura</p>
                </div>
                <span className="badge bg-primary/10 text-primary">
                  <Activity className="h-3.5 w-3.5" /> {data.metrics.total_exams} no total
                </span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.by_month} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="examsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 6"
                      vertical={false}
                      stroke="rgba(148,163,184,0.16)"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#38BDF8', strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="exams"
                      stroke="#38BDF8"
                      strokeWidth={2.5}
                      fill="url(#examsGradient)"
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="card p-5"
            >
              <div className="mb-4">
                <p className="section-title">Fila de laudos</p>
                <p className="text-xs text-muted">Exames aguardando analise medica</p>
              </div>
              {data.pending_reports.length ? (
                <div className="space-y-2">
                  {data.pending_reports.slice(0, 4).map((exam) => (
                    <Link
                      key={exam.id}
                      to="/exames"
                      className="flex items-center gap-3 rounded-xl border border-line/50 bg-panel/25 p-3 transition hover:border-primary/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-main">
                          {exam.patient?.full_name ?? 'Paciente'}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {formatDate(exam.created_at)} · {exam.health_unit ?? 'Sem unidade'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="Fila em dia"
                  description="Nenhum laudo aguardando analise no momento."
                  compact
                />
              )}
              <Link to="/exames" className="btn-secondary mt-4 w-full">
                Central de laudos
              </Link>
            </motion.div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="card p-5 lg:col-span-2"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="section-title">Exames recentes</p>
                  <p className="text-xs text-muted">Ultimos atendimentos registrados</p>
                </div>
                <Link to="/exames" className="text-xs font-semibold text-primary hover:underline">
                  Ver todos
                </Link>
              </div>
              {data.recent_exams.length ? (
                <div className="space-y-2">
                  {data.recent_exams.slice(0, 5).map((exam) => (
                    <ExamRow key={exam.id} exam={exam} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum exame registrado"
                  description="Inicie um exame pelo console para acompanhar a telemetria."
                  compact
                />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="card p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="section-title">Atendimentos por UBS</p>
                  <p className="text-xs text-muted">Distribuicao regional</p>
                </div>
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              {data.charts.by_unit.length ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.charts.by_unit}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.14)" />
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={98}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(56,189,248,0.06)' }} />
                      <Bar dataKey="exams" fill="#0EA5E9" radius={[0, 8, 8, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={MapPin}
                  title="Sem dados regionais"
                  description="Os atendimentos por unidade aparecerao aqui."
                  compact
                />
              )}
            </motion.div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="section-title">Capsulas em operacao</p>
                  <p className="text-xs text-muted">Sessoes ativas em tempo real</p>
                </div>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
              </div>
              {data.active_exams.length ? (
                <div className="space-y-2">
                  {data.active_exams.slice(0, 3).map((exam) => (
                    <Link
                      key={exam.id}
                      to="/console"
                      className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3 transition hover:border-accent/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-main">
                          {exam.patient?.full_name ?? 'Paciente'} · {exam.capsule_id}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          Bateria {exam.telemetry?.battery ?? '—'}% · Sinal {exam.telemetry?.signal ?? '—'}%
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-accent" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Radio}
                  title="Nenhuma capsula ativa"
                  description="Inicie um exame no console para acompanhar a telemetria."
                  compact
                />
              )}
            </div>

            <div className="card p-5">
              <p className="section-title">Acoes rapidas</p>
              <p className="text-xs text-muted">Atalhos para a rotina clinica</p>
              <div className="mt-4 grid gap-2">
                <Link to="/console" className="btn-secondary justify-start">
                  <Gamepad2 className="h-4 w-4 text-primary" /> Console de navegacao
                </Link>
                <Link to="/pacientes?new=1" className="btn-secondary justify-start">
                  <UserPlus className="h-4 w-4 text-primary" /> Cadastrar paciente
                </Link>
                <Link to="/exames" className="btn-secondary justify-start">
                  <FileText className="h-4 w-4 text-primary" /> Emitir laudo
                </Link>
                {profile.role === 'superadmin' && (
                  <Link to="/admin" className="btn-secondary justify-start">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Painel administrativo
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
