import { ApiError } from './http.js';
import { escapePostgrestValue } from './utils.js';

export function applyExamScope(query, profile) {
  if (profile.role === 'paciente') {
    return query.eq('patient_id', profile.id);
  }

  if (profile.role === 'medico') {
    if (!profile.health_unit) return query.eq('doctor_id', profile.id);
    const unit = escapePostgrestValue(profile.health_unit);
    return query.or(`doctor_id.eq.${profile.id},health_unit.eq."${unit}"`);
  }

  if (profile.role === 'operador_ubs') {
    if (!profile.health_unit) return query.eq('operator_id', profile.id);
    const unit = escapePostgrestValue(profile.health_unit);
    return query.or(`operator_id.eq.${profile.id},health_unit.eq."${unit}"`);
  }

  return query;
}

export function staffCanAccessExam(exam, profile) {
  if (!exam || !profile) return false;
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'paciente') return exam.patient_id === profile.id;
  if (!['medico', 'operador_ubs'].includes(profile.role)) return false;
  if (exam.doctor_id === profile.id || exam.operator_id === profile.id) return true;
  return Boolean(profile.health_unit) && exam.health_unit === profile.health_unit;
}

export function assertExamAccess(exam, profile) {
  if (!staffCanAccessExam(exam, profile)) {
    throw new ApiError(403, 'Voce nao possui acesso a este exame.');
  }
  return exam;
}

export function assertClinicalRole(profile) {
  if (!['superadmin', 'medico'].includes(profile.role)) {
    throw new ApiError(403, 'Apenas medicos podem executar esta acao.');
  }
}

export function examScopeLabel(profile) {
  if (profile.role === 'superadmin') return 'Toda a rede';
  if (profile.role === 'paciente') return 'Seus exames';
  return profile.health_unit || 'Sua unidade';
}

export function assertPatientAccess(patient, profile) {
  if (profile.role === 'superadmin') return patient;
  if (!['medico', 'operador_ubs'].includes(profile.role) ||
      !profile.health_unit || patient.health_unit !== profile.health_unit) {
    throw new ApiError(403, 'Paciente fora da sua unidade de saude.');
  }
  return patient;
}
