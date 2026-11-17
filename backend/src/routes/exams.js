import { scheduledAtSchema } from '../lib/validation.js';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';
import { logAudit } from '../lib/audit.js';
import {
  applyExamScope,
  assertPatientAccess,
  assertClinicalRole,
  staffCanAccessExam
} from '../lib/scope.js';
import { requireAuth, requireRole, STAFF_ROLES } from '../middleware/auth.js';

const router = Router();

const EXAM_SELECT = `
  *,
  patient:profiles!exams_patient_id_fkey(id, full_name, email, phone, cpf, health_unit),
  doctor:profiles!exams_doctor_id_fkey(id, full_name, professional_register),
  operator:profiles!exams_operator_id_fkey(id, full_name)
`;

const createExamSchema = z.object({
  patient_id: z.string().uuid('Selecione um paciente valido.'),
  capsule_id: z.string().trim().min(3, 'Informe o ID da capsula.').max(60),
  health_unit: z.string().trim().max(120).nullable().optional(),
  scheduled_at: scheduledAtSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  start_now: z.boolean().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  operator_id: z.string().uuid().nullable().optional()
});

const updateExamSchema = z.object({
  status: z.enum(['agendado', 'em_andamento', 'concluido', 'cancelado']).optional(),
  report: z.string().max(20000).nullable().optional(),
  report_status: z.enum(['pendente', 'em_analise', 'concluido']).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  scheduled_at: scheduledAtSchema,
  doctor_id: z.string().uuid().nullable().optional()
});

const telemetrySchema = z.object({
  telemetry: z.object({
    battery: z.number().min(0).max(100).optional(),
    temperature: z.number().min(0).max(60).optional(),
    ph: z.number().min(0).max(14).optional(),
    signal: z.number().min(0).max(100).optional(),
    position: z.string().max(120).optional()
  }).strict(),
  position: z.object({
    x: z.number().min(-1).max(1), y: z.number().min(-1).max(1),
    z: z.number().min(-3).max(3), rotation: z.number().min(0).max(360).optional()
  }).strict().optional()
});

const biopsySchema = z.object({
  confirmation: z.literal('CONFIRMAR'),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    rotation: z.number().optional(),
    position: z.string().max(80).optional()
  }),
  finding_label: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional()
});

async function validateAssignee(id, role, healthUnit) {
  if (!id) return;
  const { data, error } = await supabaseAdmin.from('profiles')
    .select('id, role, health_unit, status').eq('id', id).maybeSingle();
  if (error) throw new ApiError(400, error.message);
  if (!data || data.role !== role || data.status !== 'ativo' ||
      !healthUnit || data.health_unit !== healthUnit) {
    throw new ApiError(400, 'Profissional invalido ou fora da unidade do exame.');
  }
}

async function findExam(id, profile) {
  const { data: exam, error } = await supabaseAdmin
    .from('exams')
    .select(EXAM_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);
  if (!exam) throw new ApiError(404, 'Exame nao encontrado.');
  if (!staffCanAccessExam(exam, profile)) {
    throw new ApiError(403, 'Voce nao possui acesso a este exame.');
  }
  return exam;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    let query = supabaseAdmin
      .from('exams')
      .select(EXAM_SELECT)
      .order('created_at', { ascending: false })
      .limit(100);

    query = applyExamScope(query, req.profile);

    if (req.query.status) {
      query = query.eq('status', String(req.query.status));
    }
    if (req.query.patientId) {
      query = query.eq('patient_id', String(req.query.patientId));
    }
    if (req.query.doctorId) {
      query = query.eq('doctor_id', String(req.query.doctorId));
    }

    const { data, error } = await query;
    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);

    return ok(
      res,
      (data ?? []).filter((exam) => staffCanAccessExam(exam, req.profile))
    );
  })
);

router.post(
  '/',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(createExamSchema, req);

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, health_unit')
      .eq('id', body.patient_id)
      .eq('role', 'paciente')
      .maybeSingle();

    if (patientError) throw new ApiError(400, patientError.message);
    if (!patient) throw new ApiError(404, 'Paciente nao encontrado.');

    assertPatientAccess(patient, req.profile);

    const healthUnit =
      req.profile.role === 'superadmin'
        ? body.health_unit ?? patient.health_unit ?? null
        : req.profile.health_unit ?? patient.health_unit ?? null;

    if (body.start_now) {
      const { data: capsuleInUse } = await supabaseAdmin
        .from('exams')
        .select('id')
        .eq('capsule_id', body.capsule_id)
        .eq('status', 'em_andamento')
        .maybeSingle();

      if (capsuleInUse) {
        throw new ApiError(409, 'Esta capsula ja esta em uso em outro exame.');
      }
    }

    await validateAssignee(body.doctor_id, 'medico', healthUnit);
    await validateAssignee(body.operator_id, 'operador_ubs', healthUnit);
    const startNow = Boolean(body.start_now);
    const payload = {
      patient_id: body.patient_id,
      capsule_id: body.capsule_id,
      health_unit: healthUnit,
      status: startNow ? 'em_andamento' : 'agendado',
      scheduled_at: body.scheduled_at || new Date().toISOString(),
      started_at: startNow ? new Date().toISOString() : null,
      notes: body.notes ?? null,
      doctor_id:
        req.profile.role === 'medico' ? req.user.id : body.doctor_id ?? null,
      operator_id:
        req.profile.role === 'operador_ubs' ? req.user.id : body.operator_id ?? null
    };

    const { data, error } = await supabaseAdmin
      .from('exams')
      .insert(payload)
      .select(EXAM_SELECT)
      .single();

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);

    await logAudit({
      req,
      action: 'exam.create',
      entity: 'exams',
      entityId: data.id,
      metadata: {
        patient_id: data.patient_id,
        capsule_id: data.capsule_id,
        status: data.status
      }
    });

    return ok(res, data, 201);
  })
);

router.get(
  '/:id/biopsies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const exam = await findExam(req.params.id, req.profile);
    const { data, error } = await supabaseAdmin
      .from('biopsy_samples')
      .select(
        `*, validator:profiles!biopsy_samples_validated_by_fkey(id, full_name)`
      )
      .eq('exam_id', exam.id)
      .order('triggered_at', { ascending: false });

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);
    return ok(res, data ?? []);
  })
);

router.post(
  '/:id/biopsy',
  requireAuth,
  asyncHandler(async (req, res) => {
    assertClinicalRole(req.profile);
    const body = parseBody(biopsySchema, req);
    const exam = await findExam(req.params.id, req.profile);

    if (exam.status !== 'em_andamento') {
      throw new ApiError(409, 'A coleta so pode ser acionada durante um exame em andamento.');
    }

    const labCode = `BIO-${randomUUID().toUpperCase()}`;

    const { data: biopsy, error } = await supabaseAdmin
      .from('biopsy_samples')
      .insert({
        exam_id: exam.id,
        capsule_id: exam.capsule_id,
        triggered_by: req.user.id,
        coordinates: body.coordinates,
        human_validated: true,
        validated_by: req.user.id,
        validated_at: new Date().toISOString(),
        status: 'coletada',
        result: 'pendente',
        lab_code: labCode,
        notes: body.notes ?? null
      })
      .select()
      .single();

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);

    await logAudit({
      req,
      action: 'biopsy.trigger',
      entity: 'biopsy_samples',
      entityId: biopsy.id,
      metadata: {
        exam_id: exam.id,
        capsule_id: exam.capsule_id,
        coordinates: body.coordinates,
        lab_code: labCode,
        finding_label: body.finding_label ?? null
      }
    });

    return ok(res, biopsy, 201);
  })
);

router.post(
  '/:id/findings',
  requireAuth,
  requireRole('medico', 'superadmin'),
  asyncHandler(async (req, res) => {
    const body = parseBody(z.object({
      finding_id: z.string().min(1).max(80),
      status: z.enum(['confirmado', 'descartado'])
    }), req);
    const exam = await findExam(req.params.id, req.profile);
    const findings = exam.ai_findings ?? [];
    if (!findings.some((finding) => finding.id === body.finding_id)) {
      throw new ApiError(404, 'Achado nao encontrado.');
    }
    const updated = findings.map((finding) => finding.id === body.finding_id
      ? { ...finding, status: body.status, reviewed_by: req.user.id,
          reviewed_at: new Date().toISOString() } : finding);
    const { data, error } = await supabaseAdmin.from('exams')
      .update({ ai_findings: updated }).eq('id', exam.id)
      .eq('updated_at', exam.updated_at).select('ai_findings').maybeSingle();
    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);
    if (!data) throw new ApiError(409, 'O exame foi alterado. Recarregue antes de validar.');
    await logAudit({ req, action: 'exam.finding_review', entity: 'exams',
      entityId: exam.id, metadata: { finding_id: body.finding_id, status: body.status } });
    return ok(res, data.ai_findings);
  })
);

router.get(
  '/:id/report-export',
  requireAuth,
  asyncHandler(async (req, res) => {
    const exam = await findExam(req.params.id, req.profile);
    if (exam.report_status !== 'concluido' || !exam.report?.trim()) {
      throw new ApiError(409, 'O laudo ainda nao foi liberado.');
    }
    await logAudit({ req, action: 'exam.report_export', entity: 'exams', entityId: exam.id });
    return ok(res, { filename: `laudo-${exam.id}.txt`, content: [
      'InSightBot - Laudo medico', `Exame: ${exam.id}`,
      `Paciente: ${exam.patient?.full_name ?? ''}`,
      `Medico: ${exam.doctor?.full_name ?? ''}`,
      `Registro: ${exam.doctor?.professional_register ?? ''}`,
      `Unidade: ${exam.health_unit ?? ''}`, '', exam.report
    ].join('\n') });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const exam = await findExam(req.params.id, req.profile);
    const { data: biopsies } = await supabaseAdmin
      .from('biopsy_samples')
      .select(`*, validator:profiles!biopsy_samples_validated_by_fkey(id, full_name)`)
      .eq('exam_id', exam.id)
      .order('triggered_at', { ascending: false });

    return ok(res, { ...exam, biopsies: biopsies ?? [] });
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(updateExamSchema, req);
    const exam = await findExam(req.params.id, req.profile);
    const updates = {};
    const transitions = {
      agendado: ['em_andamento', 'cancelado'],
      em_andamento: ['concluido', 'cancelado'],
      concluido: [], cancelado: []
    };
    if (body.status && body.status !== exam.status &&
        !transitions[exam.status].includes(body.status)) {
      throw new ApiError(409, 'Transicao de status do exame nao permitida.');
    }
    const finalReportStatus = body.report_status ?? exam.report_status;
    const finalReport = body.report === undefined ? exam.report : body.report;
    if (finalReportStatus === 'concluido' && !finalReport?.trim()) {
      throw new ApiError(400, 'Preencha o laudo antes de concluir.');
    }

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'em_andamento' && !exam.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (body.status === 'concluido' && exam.status !== 'concluido') {
        updates.finished_at = new Date().toISOString();
      }
    }

    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;

    if (body.report !== undefined || body.report_status !== undefined) {
      assertClinicalRole(req.profile);
      if (body.report !== undefined) updates.report = body.report;
      if (body.report_status !== undefined) updates.report_status = body.report_status;
    }

    if (body.doctor_id !== undefined) {
      if (req.profile.role !== 'superadmin' && body.doctor_id !== req.user.id) {
        throw new ApiError(403, 'Apenas o administrador pode reatribuir o medico responsavel.');
      }
      await validateAssignee(body.doctor_id, 'medico', exam.health_unit);
      updates.doctor_id = body.doctor_id;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nenhuma alteracao informada.');
    }

    const { data, error } = await supabaseAdmin
      .from('exams')
      .update(updates)
      .eq('id', exam.id)
      .select(EXAM_SELECT)
      .single();

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);

    await logAudit({
      req,
      action: body.report !== undefined ? 'exam.report_update' : 'exam.update',
      entity: 'exams',
      entityId: exam.id,
      metadata: { fields: Object.keys(updates), status: data.status }
    });

    return ok(res, data);
  })
);

router.post(
  '/:id/telemetry',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(telemetrySchema, req);
    const exam = await findExam(req.params.id, req.profile);

    if (exam.status !== 'em_andamento') {
      throw new ApiError(409, 'A telemetria so pode ser registrada em exames em andamento.');
    }

    const { data, error } = await supabaseAdmin
      .from('exams')
      .update({
        telemetry: body.telemetry,
        ...(body.position ? { capsule_position: body.position } : {})
      })
      .eq('id', exam.id)
      .select('id, telemetry, capsule_position, updated_at')
      .single();

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, error.code === '23505' ? 'Capsula ou amostra ja em uso.' : error.message);
    return ok(res, data);
  })
);

export default router;
