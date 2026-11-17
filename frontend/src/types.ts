export type Role = 'superadmin' | 'medico' | 'operador_ubs' | 'paciente';
export type UserStatus = 'ativo' | 'pendente' | 'inativo';
export type ExamStatus = 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
export type ReportStatus = 'pendente' | 'em_analise' | 'concluido';
export type BiopsyStatus = 'coletada' | 'enviada_laboratorio' | 'resultado_disponivel';
export type BiopsyResult = 'pendente' | 'negativo' | 'positivo' | 'inconclusivo';
export type FindingStatus = 'pendente' | 'confirmado' | 'descartado';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  health_unit: string | null;
  professional_register: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface PatientSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf?: string | null;
  cpf_masked?: string | null;
  birth_date?: string | null;
  health_unit: string | null;
  status: UserStatus;
  avatar_url?: string | null;
  created_at: string;
}

export interface HealthUnit {
  id: string;
  name: string;
  city: string;
  state: string;
  type: 'ubs' | 'clinica' | 'hospital';
  active: boolean;
  created_at?: string;
}

export interface Telemetry {
  battery?: number;
  temperature?: number;
  ph?: number;
  signal?: number;
  position?: string;
}

export interface CapsulePosition {
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
}

export interface AiFinding {
  id: string;
  label: string;
  confidence: number;
  x?: number;
  y?: number;
  status: FindingStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

export interface Biopsy {
  id: string;
  exam_id: string;
  capsule_id: string;
  triggered_by: string | null;
  triggered_at: string;
  coordinates: CapsulePosition & { position?: string };
  human_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  status: BiopsyStatus;
  result: BiopsyResult;
  lab_code: string | null;
  notes: string | null;
  validator?: { id: string; full_name: string } | null;
}

export interface Exam {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  operator_id: string | null;
  health_unit: string | null;
  capsule_id: string;
  status: ExamStatus;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  telemetry: Telemetry;
  capsule_position: CapsulePosition;
  ai_findings: AiFinding[];
  report: string | null;
  report_status: ReportStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: { id: string; full_name: string; email: string; phone?: string | null; cpf?: string | null; health_unit?: string | null };
  doctor?: { id: string; full_name: string; professional_register: string | null } | null;
  operator?: { id: string; full_name: string } | null;
  biopsies?: Biopsy[];
}

export interface DashboardMetrics {
  total_exams: number;
  concluded: number;
  in_progress: number;
  scheduled: number;
  pending_reports: number;
  avoided_travels: number;
  reports_available: number;
  active_capsules: number;
  biopsies_total: number;
  biopsies_pending: number;
  patients_total: number;
  users_total: number;
}

export interface DashboardSummary {
  role: Role;
  scope_label: string;
  metrics: DashboardMetrics;
  charts: {
    by_unit: { name: string; exams: number }[];
    by_month: { label: string; exams: number }[];
  };
  recent_exams: Exam[];
  pending_reports: Exam[];
  active_exams: Exam[];
  upcoming_exams: Exam[];
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
