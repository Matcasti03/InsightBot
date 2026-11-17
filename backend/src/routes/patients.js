import { birthDateSchema } from '../lib/validation.js';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';
import { logAudit } from '../lib/audit.js';
import { applyExamScope, assertPatientAccess } from '../lib/scope.js';
import {
  generatePassword,
  maskCpf,
  onlyDigits,
  sanitizeSearch
} from '../lib/utils.js';
import { requireAuth, requireRole, STAFF_ROLES } from '../middleware/auth.js';

const router = Router();

const patientSchema = z.object({
  full_name: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z.string().trim().email('Informe um e-mail valido.'),
  cpf: z.string().trim().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  birth_date: birthDateSchema,
  health_unit: z.string().trim().max(120).nullable().optional(),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.').optional()
});

const patientUpdateSchema = patientSchema.omit({ email: true, password: true }).partial();

function normalizePatientPayload(body) {
  const updates = { ...body };
  if (updates.cpf !== undefined) {
    if (!updates.cpf) {
      updates.cpf = null;
    } else {
      const digits = onlyDigits(updates.cpf);
      if (digits.length !== 11) throw new ApiError(400, 'CPF deve conter 11 digitos.');
      updates.cpf = digits;
    }
  }
  if (updates.phone === '') updates.phone = null;
  if (updates.birth_date === '') updates.birth_date = null;
  if (updates.health_unit === '') updates.health_unit = null;
  return updates;
}

function scopedPatientsQuery(query, profile) {
  if (profile.role === 'superadmin') return query;
  return query.eq('health_unit', profile.health_unit || '__no_unit__');
}

router.get(
  '/',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const search = sanitizeSearch(req.query.q ?? '');
    let query = supabaseAdmin
      .from('profiles')
      .select(
        'id, full_name, email, phone, cpf, birth_date, health_unit, status, created_at, avatar_url'
      )
      .eq('role', 'paciente')
      .order('full_name', { ascending: true })
      .limit(200);

    query = scopedPatientsQuery(query, req.profile);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);

    const patients = (data ?? []).map((patient) => ({
      ...patient,
      cpf: undefined,
      cpf_masked: maskCpf(patient.cpf)
    }));

    return ok(res, patients);
  })
);

router.get(
  '/:id',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const { data: patient, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .eq('role', 'paciente')
      .maybeSingle();

    if (error) throw new ApiError(400, error.message);
    if (!patient) throw new ApiError(404, 'Paciente nao encontrado.');

    assertPatientAccess(patient, req.profile);

    let examsQuery = supabaseAdmin
      .from('exams')
      .select(
        `*, doctor:profiles!exams_doctor_id_fkey(id, full_name, professional_register),
         operator:profiles!exams_operator_id_fkey(id, full_name)`
      )
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(50);

    examsQuery = applyExamScope(examsQuery, req.profile);
    const { data: exams } = await examsQuery;

    return ok(res, { patient, exams: exams ?? [] });
  })
);

router.post(
  '/',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(patientSchema, req);
    if (req.profile.role !== 'superadmin' && !req.profile.health_unit) {
      throw new ApiError(403, 'Vincule uma unidade pelo administrador antes de cadastrar pacientes.');
    }
    const payload = normalizePatientPayload({
      cpf: body.cpf,
      phone: body.phone,
      birth_date: body.birth_date
    });

    const password = body.password ?? generatePassword();
    const healthUnit =
      req.profile.role === 'superadmin'
        ? body.health_unit ?? null
        : req.profile.health_unit ?? body.health_unit ?? null;

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name }
    });

    if (createError || !created.user) {
      throw new ApiError(400, createError?.message ?? 'Nao foi possivel criar a conta do paciente.');
    }



    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...payload,
        full_name: body.full_name,
        email: body.email.toLowerCase(),
        health_unit: healthUnit,
        role: 'paciente',
        status: 'ativo'
      })
      .eq('id', created.user.id)
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      if (profileError.code === '23505') {
        throw new ApiError(409, 'CPF ja cadastrado para outro paciente.');
      }
      throw new ApiError(400, profileError.message);
    }

    await logAudit({
      req,
      action: 'patient.create',
      entity: 'profiles',
      entityId: profile.id,
      metadata: { email: profile.email, health_unit: profile.health_unit }
    });

    return ok(
      res,
      {
        patient: profile,
        temporary_password: body.password ? undefined : password
      },
      201
    );
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(patientUpdateSchema, req);
    const { data: existing, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .eq('role', 'paciente')
      .maybeSingle();

    if (findError) throw new ApiError(400, findError.message);
    if (!existing) throw new ApiError(404, 'Paciente nao encontrado.');

    if (
      req.profile.role !== 'superadmin' &&
      req.profile.health_unit &&
      body.health_unit &&
      body.health_unit !== req.profile.health_unit
    ) {
      throw new ApiError(403, 'Nao e permitido transferir pacientes para outra unidade.');
    }

    assertPatientAccess(existing, req.profile);
    const updates = normalizePatientPayload(body);
    if (req.profile.role !== 'superadmin') {
      updates.health_unit = existing.health_unit;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'CPF ja cadastrado para outro paciente.');
      throw new ApiError(400, error.message);
    }

    await logAudit({
      req,
      action: 'patient.update',
      entity: 'profiles',
      entityId: req.params.id,
      metadata: { fields: Object.keys(updates) }
    });

    return ok(res, data);
  })
);

export default router;
