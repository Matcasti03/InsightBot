import type { BiopsyResult, BiopsyStatus, ExamStatus, ReportStatus, Role } from '../types';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    date
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function relativeTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '—';
  const diffMinutes = Math.round((date - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'day');
  return formatDate(value);
}

export function roleLabel(role?: Role | null) {
  const labels: Record<Role, string> = {
    superadmin: 'Superadmin',
    medico: 'Medico',
    operador_ubs: 'Operador UBS',
    paciente: 'Paciente'
  };
  return role ? labels[role] : '—';
}

export function examStatusLabel(status: ExamStatus) {
  const labels: Record<ExamStatus, string> = {
    agendado: 'Agendado',
    em_andamento: 'Em andamento',
    concluido: 'Concluido',
    cancelado: 'Cancelado'
  };
  return labels[status];
}

export function examStatusClass(status: ExamStatus) {
  const classes: Record<ExamStatus, string> = {
    agendado: 'bg-primary-soft text-primary',
    em_andamento: 'bg-accent/15 text-accent',
    concluido: 'bg-panel text-muted',
    cancelado: 'bg-danger/10 text-danger'
  };
  return classes[status];
}

export function reportStatusLabel(status: ReportStatus) {
  const labels: Record<ReportStatus, string> = {
    pendente: 'Laudo pendente',
    em_analise: 'Em analise',
    concluido: 'Laudo concluido'
  };
  return labels[status];
}

export function reportStatusClass(status: ReportStatus) {
  const classes: Record<ReportStatus, string> = {
    pendente: 'bg-warning/15 text-warning',
    em_analise: 'bg-primary-soft text-primary',
    concluido: 'bg-accent/15 text-accent'
  };
  return classes[status];
}

export function biopsyStatusLabel(status: BiopsyStatus) {
  const labels: Record<BiopsyStatus, string> = {
    coletada: 'Coletada',
    enviada_laboratorio: 'Enviada ao laboratorio',
    resultado_disponivel: 'Resultado disponivel'
  };
  return labels[status];
}

export function biopsyResultLabel(result: BiopsyResult) {
  const labels: Record<BiopsyResult, string> = {
    pendente: 'Aguardando resultado',
    negativo: 'Negativo',
    positivo: 'Positivo',
    inconclusivo: 'Inconclusivo'
  };
  return labels[result];
}

export function biopsyResultClass(result: BiopsyResult) {
  const classes: Record<BiopsyResult, string> = {
    pendente: 'bg-warning/15 text-warning',
    negativo: 'bg-accent/15 text-accent',
    positivo: 'bg-danger/10 text-danger',
    inconclusivo: 'bg-panel text-muted'
  };
  return classes[result];
}

export function formatCpf(cpf?: string | null) {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCpf(cpf?: string | null) {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `***.***.***-${digits.slice(-2)}`;
}

export function formatTelemetryValue(value: number | undefined, digits = 0) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (normalized.includes('user already registered')) return 'Já existe uma conta com este e-mail.';
  if (normalized.includes('password should be at least'))
    return 'A senha deve ter no mínimo 8 caracteres.';
  if (normalized.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  return message;
}
