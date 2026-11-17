import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  FlaskConical,
  Gamepad2,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Syringe,
  XCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import {
  BiopsyBadge,
  ExamStatusBadge,
  ReportStatusBadge
} from '../components/StatusBadges';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../lib/api';
import {
  biopsyResultLabel,
  cn,
  formatCpf,
  formatDate,
  formatDateTime
} from '../lib/utils';
import type {
  AiFinding,
  Biopsy,
  BiopsyResult,
  Exam,
  ExamStatus,
  FindingStatus,
  ReportStatus
} from '../types';

type FilterKey = 'todos' | 'pendentes' | 'em_andamento' | 'concluido' | 'agendado' | 'cancelado';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Aguardando laudo' },
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'concluido', label: 'Concluidos' },
  { key: 'agendado', label: 'Agendados' },
  { key: 'cancelado', label: 'Cancelados' }
];

export default function ExamsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Exam | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportDraft, setReportDraft] = useState('');
  const [reportStatusDraft, setReportStatusDraft] = useState<ReportStatus>('pendente');
  const [savingReport, setSavingReport] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [updatingBiopsyId, setUpdatingBiopsyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPatient = profile?.role === 'paciente';
  const canClinical = profile?.role === 'medico' || profile?.role === 'superadmin';

  const { data: exams, loading, error, refetch } = useAsyncData<Exam[]>(
    () => api.get<Exam[]>('/exams'),
    []
  );

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    api
      .get<Exam>(`/exams/${selectedId}`)
      .then((response) => {
        if (!active) return;
        setDetail(response);
        setReportDraft(response.report ?? '');
        setReportStatusDraft(response.report_status);
      })
      .catch((fetchError) => {
        if (!active) return;
        toast.error(
          'Falha ao carregar exame',
          fetchError instanceof Error ? fetchError.message : 'Tente novamente.'
        );
        setSelectedId(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, toast]);

  const counts = useMemo(() => {
    const list = exams ?? [];
    return {
      pendentes: list.filter(
        (exam) => exam.status === 'concluido' && exam.report_status !== 'concluido'
      ).length,
      em_andamento: list.filter((exam) => exam.status === 'em_andamento').length,
      concluido: list.filter((exam) => exam.status === 'concluido').length,
      agendado: list.filter((exam) => exam.status === 'agendado').length,
      cancelado: list.filter((exam) => exam.status === 'cancelado').length,
      todos: list.length
    };
  }, [exams]);

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (exams ?? []).filter((exam) => {
      const matchesFilter =
        filter === 'todos'
          ? true
          : filter === 'pendentes'
            ? exam.status === 'concluido' && exam.report_status !== 'concluido'
            : exam.status === (filter as ExamStatus);
      if (!matchesFilter) return false;
      if (!term) return true;
      return (
        (exam.patient?.full_name ?? '').toLowerCase().includes(term) ||
        exam.capsule_id.toLowerCase().includes(term) ||
        (exam.health_unit ?? '').toLowerCase().includes(term)
      );
    });
  }, [exams, filter, search]);

  const saveReport = async () => {
    if (!detail) return;
    setSavingReport(true);
    try {
      const updated = await api.patch<Exam>(`/exams/${detail.id}`, {
        report: reportDraft.trim() || null,
        report_status: reportStatusDraft
      });
      setDetail((current) => (current ? { ...current, ...updated } : current));
      toast.success(
        reportStatusDraft === 'concluido' ? 'Laudo emitido' : 'Laudo atualizado',
        'O registro foi salvo e auditado.'
      );
      refetch();
    } catch (saveError) {
      toast.error(
        'Falha ao salvar laudo',
        saveError instanceof Error ? saveError.message : 'Tente novamente.'
      );
    } finally {
      setSavingReport(false);
    }
  };

  const exportReport = async () => {
    if (!detail) return;
    try {
      const report = await api.get<{ filename: string; content: string }>(`/exams/${detail.id}/report-export`);
      const url = URL.createObjectURL(new Blob([report.content], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = report.filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error('Falha ao exportar laudo', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  const reviewFinding = async (finding: AiFinding, status: FindingStatus) => {
    if (!detail || !canClinical) return;
    setReviewingId(finding.id);
    try {
      const saved = await api.post<AiFinding[]>(`/exams/${detail.id}/findings`, { finding_id: finding.id, status });
      setDetail((current) => (current ? { ...current, ai_findings: saved } : current));
      toast.success(
        status === 'confirmado' ? 'Achado confirmado' : 'Achado descartado',
        'Validacao humana registrada na auditoria.'
      );
    } catch (reviewError) {
      toast.error(
        'Falha ao validar achado',
        reviewError instanceof Error ? reviewError.message : 'Tente novamente.'
      );
    } finally {
      setReviewingId(null);
    }
  };

  const updateBiopsy = async (biopsy: Biopsy, payload: Record<string, unknown>) => {
    setUpdatingBiopsyId(biopsy.id);
    try {
      const updated = await api.patch<Biopsy>(`/biopsies/${biopsy.id}`, payload);
      setDetail((current) =>
        current
          ? {
              ...current,
              biopsies: (current.biopsies ?? []).map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              )
            }
          : current
      );
      toast.success('Amostra atualizada', 'O rastreamento laboratorial foi registrado.');
    } catch (updateError) {
      toast.error(
        'Falha ao atualizar amostra',
        updateError instanceof Error ? updateError.message : 'Tente novamente.'
      );
    } finally {
      setUpdatingBiopsyId(null);
    }
  };

  const copyReport = async () => {
    if (!detail?.report) return;
    try {
      await navigator.clipboard.writeText(detail.report);
      setCopied(true);
      toast.success('Laudo copiado', 'O texto foi copiado para a area de transferencia.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Falha ao copiar', 'Selecione o texto manualmente.');
    }
  };

  return (
    <div>
      <PageHeader
        title={isPatient ? 'Meus exames' : 'Laudos e exames'}
        subtitle={
          isPatient
            ? 'Acompanhe resultados, laudos e amostras coletadas'
            : 'Central clinica de laudos, achados de IA e rastreamento de amostras'
        }
        icon={FileText}
        actions={
          !isPatient && profile?.role !== 'paciente' ? (
            <Link to="/console" className="btn-secondary">
              <Gamepad2 className="h-4 w-4" /> Ir para o console
            </Link>
          ) : undefined
        }
      />

      {!isPatient && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Aguardando laudo', counts.pendentes, 'text-warning bg-warning/10'],
            ['Em andamento', counts.em_andamento, 'text-accent bg-accent/10'],
            ['Concluidos', counts.concluido, 'text-primary bg-primary/10'],
            ['Agendados', counts.agendado, 'text-muted bg-panel']
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-main">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone as string)}>
                  <ClipboardList className="h-4 w-4" />
                </span>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isPatient ? 'Buscar no meu historico...' : 'Buscar paciente, capsula ou unidade...'}
              className="input pl-10"
              aria-label="Buscar exames"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                  filter === item.key
                    ? 'bg-primary text-white'
                    : 'bg-panel text-muted hover:text-main'
                )}
              >
                {item.label}
                {counts[item.key] > 0 && (
                  <span className={cn('ml-1.5', filter === item.key ? 'text-white/70' : 'text-muted/70')}>
                    {counts[item.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="card flex items-center gap-3 p-4">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" />
          <p className="mt-2 text-sm font-semibold">Falha ao carregar exames</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
          <button type="button" onClick={refetch} className="btn-secondary mt-4">
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && filteredExams.length === 0 && (
        <div className="card p-6">
          <EmptyState
            icon={FileText}
            title="Nenhum exame encontrado"
            description={
              isPatient
                ? 'Seus exames aparecerao aqui apos o agendamento ou realizacao.'
                : 'Ajuste os filtros ou inicie um novo exame pelo console.'
            }
            action={
              !isPatient ? (
                <Link to="/console" className="btn-primary">
                  <Gamepad2 className="h-4 w-4" /> Abrir console
                </Link>
              ) : undefined
            }
          />
        </div>
      )}

      {!loading && filteredExams.length > 0 && (
        <div className="space-y-3">
          {filteredExams.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => setSelectedId(exam.id)}
              className="card card-hover flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center"
            >
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  exam.status === 'em_andamento'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-primary/10 text-primary'
                )}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-main">
                  {isPatient
                    ? `${exam.health_unit ?? 'Unidade InSightBot'} · ${exam.capsule_id}`
                    : exam.patient?.full_name ?? 'Paciente'}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {exam.capsule_id} · {exam.health_unit ?? 'Sem unidade'} ·{' '}
                  {formatDate(exam.status === 'agendado' ? exam.scheduled_at : exam.created_at)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <ExamStatusBadge status={exam.status} />
                  <ReportStatusBadge status={exam.report_status} />
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <ExamStatusBadge status={exam.status} />
                <ReportStatusBadge status={exam.report_status} />
              </div>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail ? `Exame ${detail.capsule_id}` : 'Detalhes do exame'}
        description={
          detail
            ? `${detail.patient?.full_name ?? 'Paciente'} · ${detail.health_unit ?? 'Sem unidade'}`
            : undefined
        }
        size="lg"
        footer={
          <>
            {detail?.report && (
              <button type="button" onClick={copyReport} className="btn-secondary">
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar laudo'}
              </button>
            )}
            {!isPatient && detail?.status === 'em_andamento' && (
              <Link to="/console" className="btn-secondary">
                <Gamepad2 className="h-4 w-4" /> Console
              </Link>
            )}
            <button type="button" onClick={() => setSelectedId(null)} className="btn-primary">
              Fechar
            </button>
          </>
        }
      >
        {detailLoading && (
          <div className="space-y-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        )}

        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ExamStatusBadge status={detail.status} />
              <ReportStatusBadge status={detail.report_status} />
              <span className="badge bg-panel text-muted">{detail.capsule_id}</span>
              {detail.doctor?.full_name && (
                <span className="badge bg-primary/10 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> {detail.doctor.full_name}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ['Paciente', detail.patient?.full_name ?? '—'],
                ['CPF', isPatient ? 'Dado protegido' : formatCpf(detail.patient?.cpf)],
                ['Unidade', detail.health_unit ?? '—'],
                ['Agendado', formatDate(detail.scheduled_at)],
                ['Inicio', formatDateTime(detail.started_at)],
                ['Encerrado', formatDateTime(detail.finished_at)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line/60 bg-panel/30 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-main">{value}</p>
                </div>
              ))}
            </div>

            {!isPatient && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <p className="section-title">Achados da IA</p>
                  <span className="badge bg-primary/10 text-primary">
                    {detail.ai_findings?.length ?? 0}
                  </span>
                </div>
                {!detail.ai_findings?.length ? (
                  <EmptyState
                    icon={Bot}
                    title="Nenhum achado registrado"
                    description="Nenhuma area suspeita foi sinalizada neste exame."
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {detail.ai_findings.map((finding) => (
                      <div
                        key={finding.id}
                        className={cn(
                          'rounded-xl border p-3',
                          finding.status === 'confirmado'
                            ? 'border-accent/30 bg-accent/5'
                            : finding.status === 'descartado'
                              ? 'border-line/60 bg-panel/20 opacity-70'
                              : 'border-warning/30 bg-warning/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-main">{finding.label}</p>
                          <span className="badge bg-surface/70 text-muted">
                            {finding.confidence}% confianca
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={cn(
                              'badge',
                              finding.status === 'confirmado'
                                ? 'bg-accent/15 text-accent'
                                : finding.status === 'descartado'
                                  ? 'bg-panel text-muted'
                                  : 'bg-warning/15 text-warning'
                            )}
                          >
                            {finding.status === 'confirmado'
                              ? 'Confirmado pelo medico'
                              : finding.status === 'descartado'
                                ? 'Descartado pelo medico'
                                : 'Aguardando validacao humana'}
                          </span>
                          {canClinical && finding.status === 'pendente' && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={reviewingId === finding.id}
                                onClick={() => reviewFinding(finding, 'confirmado')}
                                className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                              >
                                {reviewingId === finding.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Confirmar
                              </button>
                              <button
                                type="button"
                                disabled={reviewingId === finding.id}
                                onClick={() => reviewFinding(finding, 'descartado')}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[10px] font-bold text-muted transition hover:text-danger disabled:opacity-50"
                              >
                                <XCircle className="h-3 w-3" /> Descartar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="section-title">Laudo medico</p>
                {detail.report_status === 'concluido' && detail.report && (
                  <button type="button" onClick={exportReport} className="btn-secondary ml-auto">
                    Exportar laudo
                  </button>
                )}
              </div>
              {canClinical && !isPatient ? (
                <div className="space-y-3">
                  <textarea
                    value={reportDraft}
                    onChange={(event) => setReportDraft(event.target.value)}
                    className="textarea min-h-[140px]"
                    placeholder="Descreva os achados endoscopicos, conclusao e conduta recomendada..."
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <select
                      value={reportStatusDraft}
                      onChange={(event) =>
                        setReportStatusDraft(event.target.value as ReportStatus)
                      }
                      className="select sm:max-w-[220px]"
                    >
                      <option value="pendente">Laudo pendente</option>
                      <option value="em_analise">Em analise</option>
                      <option value="concluido">Laudo concluido</option>
                    </select>
                    <button
                      type="button"
                      onClick={saveReport}
                      disabled={savingReport}
                      className="btn-primary"
                    >
                      {savingReport ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Salvar laudo
                    </button>
                  </div>
                </div>
              ) : detail.report ? (
                <div className="rounded-xl border border-line/60 bg-panel/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-main">
                    {detail.report}
                  </p>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Status: {detail.report_status === 'concluido' ? 'Laudo concluido' : 'Em processamento'}
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Laudo ainda nao disponivel"
                  description="O medico responsavel ira liberar o resultado apos a analise das imagens."
                  compact
                />
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Syringe className="h-4 w-4 text-primary" />
                <p className="section-title">Amostras e rastreamento</p>
                <span className="badge bg-primary/10 text-primary">
                  {detail.biopsies?.length ?? 0}
                </span>
              </div>
              {!detail.biopsies?.length ? (
                <EmptyState
                  icon={FlaskConical}
                  title="Nenhuma amostra coletada"
                  description="Nao houve acionamento do mecanismo de biopsia neste exame."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {detail.biopsies.map((biopsy) => (
                    <div key={biopsy.id} className="rounded-xl border border-line/60 bg-panel/25 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-bold text-main">
                            {biopsy.lab_code ?? biopsy.id.slice(0, 8)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            Capsula {biopsy.capsule_id} · {formatDateTime(biopsy.triggered_at)}
                          </p>
                        </div>
                        <span className="badge bg-surface/60 text-muted">
                          <MapPin className="h-3 w-3" />
                          X {biopsy.coordinates?.x?.toFixed(2) ?? '—'} · Y{' '}
                          {biopsy.coordinates?.y?.toFixed(2) ?? '—'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <BiopsyBadge biopsy={biopsy} />
                      </div>
                      {canClinical && !isPatient && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {!biopsy.human_validated && (
                            <button
                              type="button"
                              disabled={updatingBiopsyId === biopsy.id}
                              onClick={() => updateBiopsy(biopsy, { human_validated: true })}
                              className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[10px] font-bold text-accent transition hover:bg-accent/20 disabled:opacity-50"
                            >
                              {updatingBiopsyId === biopsy.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3 w-3" />
                              )}
                              Validar coleta
                            </button>
                          )}
                          <select
                            value={biopsy.result}
                            disabled={updatingBiopsyId === biopsy.id}
                            onChange={(event) =>
                              updateBiopsy(biopsy, {
                                result: event.target.value as BiopsyResult
                              })
                            }
                            className="select w-auto py-1.5 text-[11px]"
                            aria-label="Resultado da biopsia"
                          >
                            <option value="pendente">Aguardando resultado</option>
                            <option value="negativo">Negativo</option>
                            <option value="positivo">Positivo</option>
                            <option value="inconclusivo">Inconclusivo</option>
                          </select>
                          <span className="text-[10px] text-muted">
                            Resultado atual: {biopsyResultLabel(biopsy.result)}
                          </span>
                        </div>
                      )}
                      {biopsy.validator?.full_name && (
                        <p className="mt-2 text-[10px] text-muted">
                          Validado por {biopsy.validator.full_name} em{' '}
                          {formatDateTime(biopsy.validated_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detail.notes && (
              <div className="rounded-xl border border-line/60 bg-panel/30 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  Observacoes do exame
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-main">
                  {detail.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
