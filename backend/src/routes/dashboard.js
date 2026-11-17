import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { asyncHandler, ok } from '../lib/http.js';
import { applyExamScope, examScopeLabel, staffCanAccessExam } from '../lib/scope.js';
import { monthLabel } from '../lib/utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EXAM_SELECT = `
  id, patient_id, doctor_id, operator_id, health_unit, capsule_id, status, report_status,
  scheduled_at, started_at, finished_at, telemetry, created_at,
  patient:profiles!exams_patient_id_fkey(full_name, email)
`;

function buildMonthBuckets() {
  const buckets = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(date),
      exams: 0
    });
  }
  return buckets;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = req.profile;
    let examsQuery = supabaseAdmin
      .from('exams')
      .select(EXAM_SELECT)
      .order('created_at', { ascending: false })
      .limit(500);

    examsQuery = applyExamScope(examsQuery, profile);
    const { data: exams, error } = await examsQuery;
    if (error) throw new Error(error.message);

    const scopedExams = exams ?? [];
    const visibleExams = scopedExams.filter((exam) => staffCanAccessExam(exam, profile));
    const inProgress = visibleExams.filter((exam) => exam.status === 'em_andamento');
    const scheduled = visibleExams.filter((exam) => exam.status === 'agendado');
    const concluded = visibleExams.filter((exam) => exam.status === 'concluido');
    const pendingReports = visibleExams.filter(
      (exam) => exam.status === 'concluido' && exam.report_status !== 'concluido'
    );

    let biopsies = [];
    if (visibleExams.length > 0) {
      const { data: biopsyRows } = await supabaseAdmin
        .from('biopsy_samples')
        .select('id, exam_id, result, status, human_validated, triggered_at')
        .in(
          'exam_id',
          visibleExams.map((exam) => exam.id)
        );
      biopsies = biopsyRows ?? [];
    }

    const byUnitMap = new Map();
    visibleExams.forEach((exam) => {
      const unit = exam.health_unit || 'Sem unidade';
      byUnitMap.set(unit, (byUnitMap.get(unit) ?? 0) + 1);
    });
    const byUnit = [...byUnitMap.entries()]
      .map(([name, count]) => ({ name, exams: count }))
      .sort((a, b) => b.exams - a.exams)
      .slice(0, 6);

    const monthBuckets = buildMonthBuckets();
    visibleExams.forEach((exam) => {
      const date = new Date(exam.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBuckets.find((item) => item.key === key);
      if (bucket) bucket.exams += 1;
    });

    const activeCapsules = new Set(inProgress.map((exam) => exam.capsule_id)).size;

    let patientsTotal = 0;
    let usersTotal = 0;
    if (profile.role !== 'paciente') {
      let patientsQuery = supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'paciente');

      if (profile.role !== 'superadmin') {
        patientsQuery = patientsQuery.eq('health_unit', profile.health_unit || '__no_unit__');
      }
      const patientsResult = await patientsQuery;
      patientsTotal = patientsResult.count ?? 0;
    }
    if (profile.role === 'superadmin') {
      const usersResult = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      usersTotal = usersResult.count ?? 0;
    }

    const metrics = {
      total_exams: visibleExams.length,
      concluded: concluded.length,
      in_progress: inProgress.length,
      scheduled: scheduled.length,
      pending_reports: pendingReports.length,
      avoided_travels: concluded.filter((exam) => Boolean(exam.health_unit)).length,
      reports_available: visibleExams.filter((exam) => exam.report_status === 'concluido').length,
      active_capsules: activeCapsules,
      biopsies_total: biopsies.length,
      biopsies_pending: biopsies.filter((biopsy) => biopsy.result === 'pendente').length,
      patients_total: patientsTotal,
      users_total: usersTotal
    };

    return ok(res, {
      role: profile.role,
      scope_label: examScopeLabel(profile),
      metrics,
      charts: {
        by_unit: byUnit,
        by_month: monthBuckets.map(({ label, exams: count }) => ({ label, exams: count }))
      },
      recent_exams: visibleExams.slice(0, 8),
      pending_reports: pendingReports.slice(0, 6),
      active_exams: inProgress.slice(0, 6),
      upcoming_exams: [...scheduled]
        .sort((a, b) => new Date(a.scheduled_at || a.created_at).getTime() - new Date(b.scheduled_at || b.created_at).getTime())
        .slice(0, 3)
    });
  })
);

export default router;
