import GripperControls from '../components/GripperControls';
import { DEFAULT_GRIPPER, type GripperState } from '../lib/microGripper';
import type { SimulationMotion } from '../lib/digestiveSimulation';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BatteryMedium,
  Bot,
  Camera,
  CheckCircle2,
  CircleDot,
  FlaskConical,
  Gamepad2,
  Loader2,
  MapPin,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  RotateCw,
  ScanLine,
  ShieldCheck,
  Signal,
  Square,
  Syringe,
  Thermometer,
  Timer,
  XCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { PageSkeleton } from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Joystick from '../components/Joystick';
import CapsuleScene from '../components/CapsuleScene';
import SimulatedFeed from '../components/SimulatedFeed';
import SlideToConfirm from '../components/SlideToConfirm';
import { BiopsyBadge, ExamStatusBadge } from '../components/StatusBadges';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../lib/api';
import {
  clamp,
  cn,
  formatDateTime
} from '../lib/utils';
import type {
  AiFinding,
  Biopsy,
  CapsulePosition,
  Exam,
  FindingStatus,
  PatientSummary,
  Telemetry
} from '../types';

type FeedMode = 'camera' | 'mapping';

const TONE_CLASSES = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  warning: 'text-warning bg-warning/10',
  danger: 'text-danger bg-danger/10'
};

function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  tone = 'primary',
  progress
}: {
  icon: typeof BatteryMedium;
  label: string;
  value: string;
  unit?: string;
  tone?: keyof typeof TONE_CLASSES;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-panel/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASSES[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-2 text-xl font-extrabold text-main">
        {value}
        {unit && <span className="ml-1 text-[10px] font-semibold text-muted">{unit}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress < 20 ? 'bg-danger' : progress < 45 ? 'bg-warning' : 'bg-accent'
            )}
            style={{ width: `${clamp(progress, 0, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function formatElapsed(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function randomCapsuleId() {
  return `IB-CAP-${Math.floor(100 + Math.random() * 900)}`;
}

export default function ConsolePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedPatient = searchParams.get('patient');

  const {
    data: activeExams,
    loading: examsLoading,
    error: examsError,
    refetch: refetchExams
  } = useAsyncData<Exam[]>(() => api.get<Exam[]>('/exams?status=em_andamento'), []);
  const { data: patients } = useAsyncData<PatientSummary[]>(() => api.get<PatientSummary[]>('/patients'), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>({});
  const [orientation, setOrientation] = useState<CapsulePosition>({ x: 0, y: 0, z: 0, rotation: 0 });
  const [findings, setFindings] = useState<AiFinding[]>([]);
  const [biopsies, setBiopsies] = useState<Biopsy[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>('camera');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [simulating, setSimulating] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [startOpen, setStartOpen] = useState(false);
  const [startForm, setStartForm] = useState({ patient_id: '', capsule_id: '', notes: '' });
  const [starting, setStarting] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [biopsyOpen, setBiopsyOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [gripper, setGripper] = useState<GripperState>({ ...DEFAULT_GRIPPER });
  const [biopsying, setBiopsying] = useState(false);
  const [biopsyFindingId, setBiopsyFindingId] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [validatingBiopsyId, setValidatingBiopsyId] = useState<string | null>(null);

  const simulationMotion = useRef<SimulationMotion>({ time: 0, distance: 0 });
  const telemetryRef = useRef(telemetry);
  const orientationRef = useRef(orientation);
  telemetryRef.current = telemetry;
  orientationRef.current = orientation;

  const canPerformBiopsy = profile?.role === 'medico' || profile?.role === 'superadmin';

  useEffect(() => {
    if (!activeExams) return;
    setSelectedId((current) => {
      if (current && activeExams.some((item) => item.id === current)) return current;
      return activeExams[0]?.id ?? null;
    });
  }, [activeExams]);

  useEffect(() => {
    const current = activeExams?.find((item) => item.id === selectedId) ?? null;
    setExam(current);
    if (!current) return;
    simulationMotion.current = { time: 0, distance: 0 };
    setGripper({ ...DEFAULT_GRIPPER });

    setTelemetry({
      battery: current.telemetry?.battery ?? 86,
      temperature: current.telemetry?.temperature ?? 37,
      ph: current.telemetry?.ph ?? 6.7,
      signal: current.telemetry?.signal ?? 93,
      position: current.telemetry?.position ?? 'Estomago - corpo'
    });
    setOrientation({
      x: current.capsule_position?.x ?? 0,
      y: current.capsule_position?.y ?? 0,
      z: current.capsule_position?.z ?? 0,
      rotation: current.capsule_position?.rotation ?? 0
    });
    setFindings(current.ai_findings ?? []);
    setFeedMode('camera');
    setAiEnabled(true);
    setSimulating(true);
    setArmed(false);
    setBiopsyOpen(false);
    setBiopsyFindingId('');
    setBiopsies([]);

    let active = true;
    api
      .get<Biopsy[]>(`/exams/${current.id}/biopsies`)
      .then((samples) => { if (active) setBiopsies(samples); })
      .catch(() => { if (active) setBiopsies([]); });
    return () => { active = false; };
  }, [selectedId, activeExams]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!exam || !simulating) return;
    const interval = window.setInterval(() => {
      setTelemetry((previous) => ({
        battery: clamp((previous.battery ?? 86) - 0.02, 3, 100),
        temperature: clamp(37 + (Math.random() - 0.5) * 0.35, 36.2, 38.2),
        ph: clamp((previous.ph ?? 6.7) + (Math.random() - 0.5) * 0.08, 5.4, 7.9),
        signal: clamp((previous.signal ?? 93) + (Math.random() - 0.5) * 4, 48, 100),
        position: previous.position ?? 'Estomago - corpo'
      }));
    }, 1400);
    return () => window.clearInterval(interval);
  }, [exam?.id, simulating]);

  useEffect(() => {
    if (!exam?.id) return;
    const interval = window.setInterval(() => {
      api
        .post(`/exams/${exam.id}/telemetry`, {
          telemetry: telemetryRef.current,
          position: orientationRef.current
        })
        .catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [exam?.id]);

  useEffect(() => {
    if (!exam) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      const step = 0.12;

      if (key === 'arrowleft' || key === 'a') {
        event.preventDefault();
        setOrientation((previous) => ({ ...previous, x: clamp((previous.x ?? 0) - step, -1, 1) }));
      }
      if (key === 'arrowright' || key === 'd') {
        event.preventDefault();
        setOrientation((previous) => ({ ...previous, x: clamp((previous.x ?? 0) + step, -1, 1) }));
      }
      if (key === 'arrowup' || key === 'w') {
        event.preventDefault();
        setOrientation((previous) => ({ ...previous, y: clamp((previous.y ?? 0) - step, -1, 1) }));
      }
      if (key === 'arrowdown' || key === 's') {
        event.preventDefault();
        setOrientation((previous) => ({ ...previous, y: clamp((previous.y ?? 0) + step, -1, 1) }));
      }
      if (key === 'q') {
        setOrientation((previous) => ({
          ...previous,
          rotation: ((previous.rotation ?? 0) - 10 + 360) % 360
        }));
      }
      if (key === 'e') {
        setOrientation((previous) => ({
          ...previous,
          rotation: ((previous.rotation ?? 0) + 10) % 360
        }));
      }
      if (key === 'z') {
        setOrientation((previous) => ({ ...previous, z: clamp((previous.z ?? 0) - 0.2, -3, 3) }));
      }
      if (key === 'x') {
        setOrientation((previous) => ({ ...previous, z: clamp((previous.z ?? 0) + 0.2, -3, 3) }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [exam?.id]);

  useEffect(() => {
    if (!preselectedPatient || !patients?.length) return;
    const exists = patients.some((patient) => patient.id === preselectedPatient);
    if (!exists) return;
    setStartForm({
      patient_id: preselectedPatient,
      capsule_id: randomCapsuleId(),
      notes: ''
    });
    setStartOpen(true);
  }, [preselectedPatient, patients]);

  const openStartModal = () => {
    setStartForm({
      patient_id: preselectedPatient ?? patients?.[0]?.id ?? '',
      capsule_id: randomCapsuleId(),
      notes: ''
    });
    setStartOpen(true);
  };

  const handleStartExam = async () => {
    if (!startForm.patient_id) {
      toast.error('Selecione um paciente', 'E necessario vincular o exame a um paciente.');
      return;
    }
    if (startForm.capsule_id.trim().length < 3) {
      toast.error('Informe a capsula', 'Digite o ID impresso na embalagem da capsula.');
      return;
    }

    setStarting(true);
    try {
      const created = await api.post<Exam>('/exams', {
        patient_id: startForm.patient_id,
        capsule_id: startForm.capsule_id.trim(),
        notes: startForm.notes.trim() || null,
        start_now: true
      });
      toast.success('Exame iniciado', `${created.capsule_id} pareada e pronta para telemetria.`);
      setStartOpen(false);
      setSelectedId(created.id);
      refetchExams();
    } catch (error) {
      toast.error(
        'Nao foi possivel iniciar o exame',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setStarting(false);
    }
  };

  const handleEndExam = async () => {
    if (!exam) return;
    setEnding(true);
    try {
      await api.patch(`/exams/${exam.id}`, { status: 'concluido' });
      toast.success('Exame encerrado', 'A sessao foi finalizada e enviada para a fila de laudos.');
      setEndOpen(false);
      setSelectedId(null);
      refetchExams();
    } catch (error) {
      toast.error(
        'Falha ao encerrar',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setEnding(false);
    }
  };

  const handleBiopsy = async () => {
    if (!exam || !armed || !canPerformBiopsy || biopsying) return;
    const finding = findings.find((item) => item.id === biopsyFindingId);
    setBiopsying(true);
    try {
      const biopsy = await api.post<Biopsy>(`/exams/${exam.id}/biopsy`, {
        confirmation: 'CONFIRMAR',
        coordinates: {
          x: orientation.x ?? 0,
          y: orientation.y ?? 0,
          z: orientation.z ?? 0,
          rotation: orientation.rotation ?? 0,
          position: telemetry.position
        },
        finding_label: finding?.label ?? null
      });
      setBiopsies((previous) => [biopsy, ...previous]);
      setGripper((current) => ({ ...current, enabled: true, opening: 0 }));
      setBiopsyOpen(false);
      setArmed(false);
      toast.success(
        'Microcoleta registrada',
        `Amostra ${biopsy.lab_code} vinculada a capsula ${biopsy.capsule_id}.`
      );
    } catch (error) {
      toast.error(
        'Falha na coleta',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setBiopsying(false);
    }
  };

  const reviewFinding = async (finding: AiFinding, status: FindingStatus) => {
    if (!exam || !canPerformBiopsy) return;
    setReviewingId(finding.id);
    const previous = findings;
    const updated = findings.map((item) =>
      item.id === finding.id
        ? {
            ...item,
            status,
            reviewed_by: profile?.id ?? null,
            reviewed_at: new Date().toISOString()
          }
        : item
    );
    setFindings(updated);
    try {
      const saved = await api.post<AiFinding[]>(`/exams/${exam.id}/findings`, { finding_id: finding.id, status });
      setFindings(saved);
      toast.success(
        status === 'confirmado' ? 'Achado confirmado' : 'Achado descartado',
        'Decisao registrada na trilha de auditoria.'
      );
    } catch (error) {
      setFindings(previous);
      toast.error(
        'Falha ao registrar validacao',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setReviewingId(null);
    }
  };

  const validateBiopsy = async (biopsy: Biopsy) => {
    setValidatingBiopsyId(biopsy.id);
    try {
      const updated = await api.patch<Biopsy>(`/biopsies/${biopsy.id}`, {
        human_validated: true
      });
      setBiopsies((previous) =>
        previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
      toast.success('Coleta validada', 'A validacao humana foi registrada com sucesso.');
    } catch (error) {
      toast.error(
        'Falha ao validar',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setValidatingBiopsyId(null);
    }
  };

  const resetOrientation = () =>
    setOrientation({ x: 0, y: 0, z: 0, rotation: 0 });

  if (examsLoading) return <PageSkeleton />;

  if (examsError) {
    return (
      <div>
        <PageHeader title="Console de Navegacao" subtitle="Telemetria e controle magnetico da capsula" />
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">Falha ao carregar as sessoes</p>
          <p className="max-w-sm text-xs text-muted">{examsError}</p>
          <button type="button" onClick={refetchExams} className="btn-secondary mt-2">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div>
        <PageHeader
          title="Console de Navegacao"
          subtitle="Telemetria em tempo real e controle magnetico da capsula"
          actions={
            <button type="button" onClick={openStartModal} className="btn-primary">
              <Plus className="h-4 w-4" /> Iniciar exame
            </button>
          }
        />

        <div className="card p-6 sm:p-10">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Gamepad2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Nenhuma capsula em operacao</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Inicie uma nova sessao para parear a capsula, monitorar sinais vitais e conduzir a
              navegacao magnetica com seguranca.
            </p>
            <button type="button" onClick={openStartModal} className="btn-primary mt-6">
              <Plus className="h-4 w-4" /> Iniciar novo exame
            </button>
            {activeExams && activeExams.length > 0 && (
              <div className="mt-6 space-y-2 text-left">
                {activeExams.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line/60 p-3 text-left transition hover:border-primary/40"
                  >
                    <Radio className="h-4 w-4 text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.patient?.full_name ?? 'Paciente'} · {item.capsule_id}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {item.health_unit ?? 'Sem unidade'}
                      </span>
                    </span>
                    <ExamStatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              {[
                ['Pareamento', 'Vincule a capsula ao paciente e confirme o ID.'],
                ['Navegacao', 'Ajuste os eixos X, Y, Z e a rotacao magnetica.'],
                ['Seguranca', 'Biopisia exige dupla confirmacao e validacao medica.']
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border border-line/60 bg-panel/30 p-3">
                  <p className="text-xs font-bold text-main">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Modal
          open={startOpen}
          onClose={() => setStartOpen(false)}
          title="Iniciar novo exame"
          description="Vincule o paciente e pareie a capsula antes de iniciar a telemetria."
          footer={
            <>
              <button type="button" onClick={() => setStartOpen(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartExam}
                disabled={starting}
                className="btn-primary"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Iniciar sessao
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="patient" className="label">
                Paciente
              </label>
              <select
                id="patient"
                value={startForm.patient_id}
                onChange={(event) =>
                  setStartForm((current) => ({ ...current, patient_id: event.target.value }))
                }
                className="select"
              >
                <option value="">Selecione um paciente</option>
                {patients?.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} · {patient.cpf_masked ?? 'CPF nao informado'}
                  </option>
                ))}
              </select>
              {!patients?.length && (
                <p className="mt-2 text-[11px] text-warning">
                  Nenhum paciente disponivel.{' '}
                  <Link to="/pacientes?new=1" className="font-semibold underline">
                    Cadastre um paciente
                  </Link>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="capsule" className="label">
                ID da capsula
              </label>
              <input
                id="capsule"
                value={startForm.capsule_id}
                onChange={(event) =>
                  setStartForm((current) => ({ ...current, capsule_id: event.target.value }))
                }
                className="input"
                placeholder="IB-CAP-000"
              />
              <p className="mt-1.5 text-[11px] text-muted">
                Informe o codigo impresso na embalagem esteril da capsula.
              </p>
            </div>
            <div>
              <label htmlFor="notes" className="label">
                Observacoes
              </label>
              <textarea
                id="notes"
                value={startForm.notes}
                onChange={(event) =>
                  setStartForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="textarea"
                placeholder="Preparo, intercorrencias ou observacoes clinicas..."
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const elapsed = exam.started_at
    ? formatElapsed(now - new Date(exam.started_at).getTime())
    : '00:00:00';
  const pendingFindings = findings.filter((finding) => finding.status === 'pendente');
  const battery = telemetry.battery ?? 0;
  const signal = telemetry.signal ?? 0;

  return (
    <div>
      <PageHeader
        title="Console de Navegacao"
        subtitle={`${exam.patient?.full_name ?? 'Paciente'} · ${exam.health_unit ?? 'Sem unidade'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Selecionar exame ativo"
              value={exam.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className="select w-full min-w-0 py-2 text-xs sm:w-auto sm:min-w-[220px]"
            >
              {activeExams?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.capsule_id} · {item.patient?.full_name ?? 'Paciente'}
                </option>
              ))}
            </select>
            <button type="button" onClick={openStartModal} className="btn-secondary">
              <Plus className="h-4 w-4" /> Novo
            </button>
            <button type="button" onClick={() => setEndOpen(true)} className="btn-danger">
              <Square className="h-4 w-4" /> Encerrar
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ExamStatusBadge status={exam.status} />
        <span className="badge bg-panel text-muted">
          <Radio className="h-3.5 w-3.5" /> {exam.capsule_id}
        </span>
        <span className="badge bg-primary/10 text-primary">
          <Timer className="h-3.5 w-3.5" /> {elapsed}
        </span>
        <span className="badge bg-accent/10 text-accent">
          <CircleDot className="h-3.5 w-3.5" /> Telemetria {simulating ? 'ativa' : 'pausada'}
        </span>
        {!canPerformBiopsy && (
          <span className="badge bg-warning/10 text-warning">
            <ShieldCheck className="h-3.5 w-3.5" /> Biopsia restrita ao medico
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedMode('camera')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    feedMode === 'camera'
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-panel hover:text-main'
                  )}
                >
                  <Camera className="h-3.5 w-3.5" /> Camera HD
                </button>
                <button
                  type="button"
                  onClick={() => setFeedMode('mapping')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    feedMode === 'mapping'
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-panel hover:text-main'
                  )}
                >
                  <ScanLine className="h-3.5 w-3.5" /> Mapa 3D
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Conexao segura
              </div>
            </div>

            <div className="relative aspect-video bg-slate-950">
              {feedMode === 'camera' ? (
                <SimulatedFeed
                  findings={findings}
                  aiEnabled={aiEnabled}
                  capsuleId={exam.capsule_id}
                  signal={telemetry.signal}
                  position={telemetry.position}
                  look={{ x: orientation.x ?? 0, y: orientation.y ?? 0, z: orientation.z, rotation: orientation.rotation }}
                  motion={simulationMotion}
                  gripper={gripper}
                  active={simulating}
                />
              ) : (
                <div className="relative h-full w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                  <CapsuleScene orientation={orientation} active={simulating} motion={simulationMotion} gripper={gripper} />
                  <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-primary/30 bg-black/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm">
                    Simulacao 3D · corte do trato digestivo
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                      X {orientation.x?.toFixed(2) ?? '0.00'}
                    </span>
                    <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                      Y {orientation.y?.toFixed(2) ?? '0.00'}
                    </span>
                    <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                      Z {orientation.z?.toFixed(2) ?? '0.00'}
                    </span>
                    <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                      {orientation.rotation ?? 0}°
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <Joystick
                onChange={(vector) =>
                  setOrientation((previous) => ({ ...previous, x: vector.x, y: vector.y }))
                }
                disabled={!simulating}
              />

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['Eixo X', (orientation.x ?? 0).toFixed(2)],
                    ['Eixo Y', (orientation.y ?? 0).toFixed(2)],
                    ['Eixo Z', (orientation.z ?? 0).toFixed(2)],
                    ['Rotacao', `${orientation.rotation ?? 0}°`]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-line/60 bg-panel/30 px-2.5 py-2 text-center"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-main">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-line/60 bg-panel/30 p-2">
                    <span className="text-[11px] font-semibold text-muted">Profundidade Z</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOrientation((previous) => ({
                            ...previous,
                            z: clamp((previous.z ?? 0) - 0.2, -3, 3)
                          }))
                        }
                        className="icon-btn h-7 w-7 text-xs"
                        aria-label="Diminuir profundidade"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-xs font-bold">
                        {(orientation.z ?? 0).toFixed(1)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOrientation((previous) => ({
                            ...previous,
                            z: clamp((previous.z ?? 0) + 0.2, -3, 3)
                          }))
                        }
                        className="icon-btn h-7 w-7 text-xs"
                        aria-label="Aumentar profundidade"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line/60 bg-panel/30 p-2">
                    <span className="text-[11px] font-semibold text-muted">Rotacao magnetica</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOrientation((previous) => ({
                            ...previous,
                            rotation: ((previous.rotation ?? 0) - 15 + 360) % 360
                          }))
                        }
                        className="icon-btn h-7 w-7"
                        aria-label="Rotacionar anti-horario"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-bold">
                        {orientation.rotation ?? 0}°
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOrientation((previous) => ({
                            ...previous,
                            rotation: ((previous.rotation ?? 0) + 15) % 360
                          }))
                        }
                        className="icon-btn h-7 w-7"
                        aria-label="Rotacionar horario"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimulating((value) => !value)}
                    className="btn-secondary"
                  >
                    {simulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {simulating ? 'Pausar simulacao' : 'Retomar simulacao'}
                  </button>
                  <button type="button" onClick={resetOrientation} className="btn-ghost">
                    <RotateCcw className="h-4 w-4" /> Centralizar
                  </button>
                  <span className="text-[10px] text-muted">Teclado: setas · Q/E · Z/X</span>
                </div>

                <GripperControls value={gripper} onChange={setGripper} disabled={!canPerformBiopsy || biopsying} />

                <div className="rounded-xl border border-danger/25 bg-danger/5 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-main">Microcoleta de biopsia</p>
                      <p className="text-[11px] leading-relaxed text-muted">
                        Exige dupla confirmacao humana e valida os riscos antes do disparo.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canPerformBiopsy || biopsying}
                      onClick={() => {
                        setArmed(false);
                        setGripper((current) => ({ ...current, enabled: true }));
                        setBiopsyFindingId('');
                        setBiopsyOpen(true);
                      }}
                      className="btn-danger shrink-0"
                    >
                      <Syringe className="h-4 w-4" /> Acionar biopsia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-title">Telemetria</p>
                <p className="text-xs text-muted">Sinais da capsula em tempo real</p>
              </div>
              <span className="badge bg-accent/10 text-accent">
                <Signal className="h-3.5 w-3.5" /> {signal.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricTile
                icon={BatteryMedium}
                label="Bateria"
                value={battery.toFixed(0)}
                unit="%"
                tone={battery < 20 ? 'danger' : 'accent'}
                progress={battery}
              />
              <MetricTile
                icon={Thermometer}
                label="Temperatura"
                value={(telemetry.temperature ?? 37).toFixed(1)}
                unit="°C"
                tone="warning"
              />
              <MetricTile
                icon={FlaskConical}
                label="pH gastrico"
                value={(telemetry.ph ?? 6.7).toFixed(1)}
                tone="primary"
              />
              <MetricTile
                icon={Signal}
                label="Qualidade do sinal"
                value={signal.toFixed(0)}
                unit="%"
                tone="accent"
                progress={signal}
              />
            </div>

            <div className="mt-2 flex items-center gap-3 rounded-xl border border-line/60 bg-panel/30 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Posicao estimada
                </p>
                <p className="truncate text-sm font-bold text-main">
                  {telemetry.position ?? 'Mapeando...'}
                </p>
              </div>
              <span className="relative ml-auto flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-title">Assistente de IA</p>
                <p className="text-xs text-muted">Apoio visual com validacao humana</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={aiEnabled}
                onClick={() => setAiEnabled((value) => !value)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  aiEnabled ? 'bg-primary' : 'bg-line'
                )}
                aria-label="Alternar assistente de IA"
              >
                <span
                  className={cn(
                    'pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    aiEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {!aiEnabled && (
                <EmptyState
                  icon={Bot}
                  title="IA desativada"
                  description="Ative o assistente para destacar areas suspeitas na mucosa."
                  compact
                />
              )}
              {aiEnabled && findings.length === 0 && (
                <EmptyState
                  icon={Bot}
                  title="Nenhum achado suspeito"
                  description="A IA nao identificou areas de atencao neste trecho do exame."
                  compact
                />
              )}
              {aiEnabled &&
                findings.map((finding) => (
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
                          ? 'Confirmado'
                          : finding.status === 'descartado'
                            ? 'Descartado'
                            : 'Aguardando revisao'}
                      </span>
                      {canPerformBiopsy && finding.status === 'pendente' && (
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

            <p className="mt-4 rounded-lg bg-panel/40 p-2.5 text-[10px] leading-relaxed text-muted">
              A IA e um apoio a decisao. O achado so e registrado como valido apos confirmacao
              explicita do medico.
            </p>
            {pendingFindings.length > 0 && (
              <p className="mt-2 text-[10px] font-semibold text-warning">
                {pendingFindings.length} achado(s) aguardando validacao humana
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-title">Amostras coletadas</p>
                <p className="text-xs text-muted">Rastreamento por codigo de laboratorio</p>
              </div>
              <span className="badge bg-primary/10 text-primary">{biopsies.length}</span>
            </div>

            {biopsies.length === 0 ? (
              <EmptyState
                icon={Syringe}
                title="Nenhuma amostra coletada"
                description="As coletas acionadas durante a sessao aparecerao aqui."
                compact
              />
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {biopsies.map((biopsy) => (
                  <div
                    key={biopsy.id}
                    className="rounded-xl border border-line/60 bg-panel/25 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-main">
                          {biopsy.lab_code ?? biopsy.id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {formatDateTime(biopsy.triggered_at)}
                        </p>
                      </div>
                      <span className="badge bg-surface/60 text-muted">
                        {biopsy.capsule_id}
                      </span>
                    </div>
                    <div className="mt-2">
                      <BiopsyBadge biopsy={biopsy} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-muted">
                        X {biopsy.coordinates?.x?.toFixed(2) ?? '—'} · Y{' '}
                        {biopsy.coordinates?.y?.toFixed(2) ?? '—'} · Z{' '}
                        {biopsy.coordinates?.z?.toFixed(2) ?? '—'}
                      </p>
                      {!biopsy.human_validated && canPerformBiopsy && (
                        <button
                          type="button"
                          disabled={validatingBiopsyId === biopsy.id}
                          onClick={() => validateBiopsy(biopsy)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent transition hover:bg-accent/20 disabled:opacity-50"
                        >
                          {validatingBiopsyId === biopsy.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          Validar coleta
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Iniciar novo exame"
        description="Vincule o paciente e pareie a capsula. A sessao comeca imediatamente."
        footer={
          <>
            <button type="button" onClick={() => setStartOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleStartExam} disabled={starting} className="btn-primary">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Iniciar sessao
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="active-patient" className="label">
              Paciente
            </label>
            <select
              id="active-patient"
              value={startForm.patient_id}
              onChange={(event) =>
                setStartForm((current) => ({ ...current, patient_id: event.target.value }))
              }
              className="select"
            >
              <option value="">Selecione um paciente</option>
              {patients?.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} · {patient.cpf_masked ?? 'CPF nao informado'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="active-capsule" className="label">
              ID da capsula
            </label>
            <input
              id="active-capsule"
              value={startForm.capsule_id}
              onChange={(event) =>
                setStartForm((current) => ({ ...current, capsule_id: event.target.value }))
              }
              className="input"
              placeholder="IB-CAP-000"
            />
          </div>
          <div>
            <label htmlFor="active-notes" className="label">
              Observacoes
            </label>
            <textarea
              id="active-notes"
              value={startForm.notes}
              onChange={(event) =>
                setStartForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="textarea"
              placeholder="Preparo, intercorrencias ou observacoes clinicas..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title="Encerrar exame"
        description="A sessao sera finalizada e enviada para a fila de laudos."
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setEndOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleEndExam} disabled={ending} className="btn-danger">
              {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Encerrar exame
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-semibold text-main">Confirme o encerramento da sessao</p>
            <p className="mt-1">
              A telemetria sera interrompida. Amostras ja coletadas permanecem registradas e
              auditaveis.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={biopsyOpen}
        onClose={() => {
          setBiopsyOpen(false);
          setArmed(false);
        }}
        title="Acionar microcoleta de biopsia"
        description="Etapa critica: confirme os dados e valide duas vezes antes do disparo."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setBiopsyOpen(false);
                setArmed(false);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBiopsy}
              disabled={!armed || biopsying || !canPerformBiopsy}
              className="btn-danger"
            >
              {biopsying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Syringe className="h-4 w-4" />}
              Confirmar coleta
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {!canPerformBiopsy && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Apenas medicos e o superadmin podem acionar a coleta de biopsia.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['X', (orientation.x ?? 0).toFixed(2)],
              ['Y', (orientation.y ?? 0).toFixed(2)],
              ['Z', (orientation.z ?? 0).toFixed(2)],
              ['Rotacao', `${orientation.rotation ?? 0}°`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line/60 bg-panel/30 p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-0.5 text-sm font-bold text-main">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-line/60 bg-panel/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Capsula</p>
              <p className="mt-0.5 font-semibold text-main">{exam.capsule_id}</p>
            </div>
            <div className="rounded-xl border border-line/60 bg-panel/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">pH atual</p>
              <p className="mt-0.5 font-semibold text-main">
                {(telemetry.ph ?? 6.7).toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-line/60 bg-panel/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Temperatura</p>
              <p className="mt-0.5 font-semibold text-main">
                {(telemetry.temperature ?? 37).toFixed(1)} °C
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="biopsy-finding" className="label">
              Vincular a achado de IA (opcional)
            </label>
            <select
              id="biopsy-finding"
              value={biopsyFindingId}
              onChange={(event) => setBiopsyFindingId(event.target.value)}
              className="select"
            >
              <option value="">Sem achado especifico</option>
              {findings.map((finding) => (
                <option key={finding.id} value={finding.id}>
                  {finding.label} · {finding.confidence}%
                </option>
              ))}
            </select>
          </div>

          <SlideToConfirm
            label="Deslize para armar a microcoleta"
            completedLabel="Microcoleta armada"
            disabled={!canPerformBiopsy}
            onComplete={() => setArmed(true)}
          />

          {armed && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs font-semibold text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Primeira confirmacao concluida. Use o botao vermelho para disparar a coleta.
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-panel/40 p-3 text-[11px] leading-relaxed text-muted">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            O carimbo de tempo, as coordenadas exatas e o responsavel pela coleta serao gravados
            automaticamente na auditoria do exame.
          </div>
        </div>
      </Modal>
    </div>
  );
}
