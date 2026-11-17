import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';
import { logAudit } from '../lib/audit.js';
import { assertClinicalRole, staffCanAccessExam } from '../lib/scope.js';
import { requireAuth, requireRole, CLINICAL_ROLES } from '../middleware/auth.js';

const router = Router();

const updateBiopsySchema = z.object({
  human_validated: z.boolean().optional(),
  status: z.enum(['coletada', 'enviada_laboratorio', 'resultado_disponivel']).optional(),
  result: z.enum(['pendente', 'negativo', 'positivo', 'inconclusivo']).optional(),
  lab_code: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});

router.patch(
  '/:id',
  requireAuth,
  requireRole(...CLINICAL_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(updateBiopsySchema, req);

    const { data: biopsy, error } = await supabaseAdmin
      .from('biopsy_samples')
      .select('*, exam:exams!biopsy_samples_exam_id_fkey(id, patient_id, doctor_id, operator_id, health_unit)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw new ApiError(400, error.message);
    if (!biopsy) throw new ApiError(404, 'Amostra nao encontrada.');
    if (!staffCanAccessExam(biopsy.exam, req.profile)) {
      throw new ApiError(403, 'Voce nao possui acesso a esta amostra.');
    }

    assertClinicalRole(req.profile);

    const updates = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.result !== undefined) updates.result = body.result;
    if (body.lab_code !== undefined) updates.lab_code = body.lab_code;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (body.human_validated !== undefined) {
      updates.human_validated = body.human_validated;
      updates.validated_by = body.human_validated ? req.user.id : null;
      updates.validated_at = body.human_validated ? new Date().toISOString() : null;
    }

    if (body.result && body.result !== 'pendente' && body.status === undefined) {
      updates.status = 'resultado_disponivel';
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nenhuma alteracao informada.');
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('biopsy_samples')
      .update(updates)
      .eq('id', biopsy.id)
      .select(`*, validator:profiles!biopsy_samples_validated_by_fkey(id, full_name)`)
      .single();

    if (updateError) throw new ApiError(400, updateError.message);

    await logAudit({
      req,
      action: body.human_validated === true ? 'biopsy.human_validation' : 'biopsy.update',
      entity: 'biopsy_samples',
      entityId: biopsy.id,
      metadata: { fields: Object.keys(updates), result: data.result, status: data.status }
    });

    return ok(res, data);
  })
);

export default router;
