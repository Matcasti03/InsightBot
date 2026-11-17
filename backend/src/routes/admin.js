import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';
import { logAudit } from '../lib/audit.js';
import { generatePassword, sanitizeSearch } from '../lib/utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const adminOnly = requireRole('superadmin');
const USER_ROLES = ['superadmin', 'medico', 'operador_ubs', 'paciente'];

const createUserSchema = z.object({
  full_name: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z.string().trim().email('Informe um e-mail valido.'),
  role: z.enum(['superadmin', 'medico', 'operador_ubs']),
  health_unit: z.string().trim().max(120).nullable().optional(),
  professional_register: z.string().trim().max(40).nullable().optional(),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.').optional()
});

const updateUserSchema = z.object({
  full_name: z.string().trim().min(3).max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(['ativo', 'pendente', 'inativo']).optional(),
  health_unit: z.string().trim().max(120).nullable().optional(),
  professional_register: z.string().trim().max(40).nullable().optional()
});

const healthUnitSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome da unidade.').max(120),
  city: z.string().trim().min(2, 'Informe a cidade.').max(120),
  state: z.string().trim().length(2, 'Informe a UF com 2 letras.').toUpperCase(),
  type: z.enum(['ubs', 'clinica', 'hospital']).default('ubs'),
  active: z.boolean().optional()
});

router.get(
  '/users',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const search = sanitizeSearch(req.query.q ?? '');
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (req.query.role) query = query.eq('role', String(req.query.role));
    if (req.query.status) query = query.eq('status', String(req.query.status));
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return ok(res, data ?? []);
  })
);

router.post(
  '/users',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = parseBody(createUserSchema, req);
    const password = body.password ?? generatePassword();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name }
    });

    if (error || !created.user) {
      throw new ApiError(400, error?.message ?? 'Nao foi possivel criar a conta.');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: body.full_name,
        email: body.email.toLowerCase(),
        role: body.role,
        health_unit: body.health_unit ?? null,
        professional_register: body.professional_register ?? null,
        status: 'ativo'
      })
      .eq('id', created.user.id)
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new ApiError(400, profileError.message);
    }

    await logAudit({
      req,
      action: 'admin.user_create',
      entity: 'profiles',
      entityId: profile.id,
      metadata: { role: profile.role, health_unit: profile.health_unit }
    });

    return ok(
      res,
      { user: profile, temporary_password: body.password ? undefined : password },
      201
    );
  })
);

router.patch(
  '/users/:id',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = parseBody(updateUserSchema, req);

    if (req.params.id === req.user.id) {
      if (body.role && body.role !== 'superadmin') {
        throw new ApiError(400, 'Voce nao pode remover seu proprio acesso de superadmin.');
      }
      if (body.status && body.status !== 'ativo') {
        throw new ApiError(400, 'Voce nao pode desativar a propria conta.');
      }
    }

    const updates = {};
    for (const key of ['full_name', 'role', 'status', 'health_unit', 'professional_register']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'Nenhuma alteracao informada.');
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    await logAudit({
      req,
      action: 'admin.user_update',
      entity: 'profiles',
      entityId: req.params.id,
      metadata: { fields: Object.keys(updates), role: data.role, status: data.status }
    });

    return ok(res, data);
  })
);

router.get(
  '/health-units',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('health_units')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new ApiError(400, error.message);
    return ok(res, data ?? []);
  })
);

router.post(
  '/health-units',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = parseBody(healthUnitSchema, req);
    const { data, error } = await supabaseAdmin
      .from('health_units')
      .insert({
        name: body.name,
        city: body.city,
        state: body.state,
        type: body.type,
        active: body.active ?? true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ApiError(409, 'Esta unidade ja esta cadastrada.');
      throw new ApiError(400, error.message);
    }

    await logAudit({
      req,
      action: 'admin.health_unit_create',
      entity: 'health_units',
      entityId: data.id,
      metadata: { name: data.name, city: data.city }
    });

    return ok(res, data, 201);
  })
);

router.patch(
  '/health-units/:id',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = parseBody(healthUnitSchema.partial(), req);
    const { data, error } = await supabaseAdmin
      .from('health_units')
      .update(body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    await logAudit({
      req,
      action: 'admin.health_unit_update',
      entity: 'health_units',
      entityId: req.params.id,
      metadata: { fields: Object.keys(body) }
    });

    return ok(res, data);
  })
);

router.get(
  '/audit',
  requireAuth,
  adminOnly,
  asyncHandler(async (req, res) => {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (req.query.action) {
      query = query.ilike('action', `%${sanitizeSearch(req.query.action)}%`);
    }

    const { data, error } = await query;
    if (error) throw new ApiError(400, error.message);
    return ok(res, data ?? []);
  })
);

export default router;
