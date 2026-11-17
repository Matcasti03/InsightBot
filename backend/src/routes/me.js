import { birthDateSchema, hasImageSignature } from '../lib/validation.js';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';
import { logAudit } from '../lib/audit.js';
import { onlyDigits } from '../lib/utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      return callback(new ApiError(400, 'Envie uma imagem JPG, PNG ou WebP.'));
    }
    return callback(null, true);
  }
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(3, 'Informe o nome completo.').max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  professional_register: z.string().trim().max(40).nullable().optional(),
  health_unit: z.string().trim().max(120).nullable().optional(),
  cpf: z.string().trim().nullable().optional(),
  birth_date: birthDateSchema
});

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => ok(res, req.profile))
);

router.patch(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(updateProfileSchema, req);
    const updates = { ...body };
    if (req.profile.role !== 'superadmin' && body.health_unit !== undefined &&
        body.health_unit !== req.profile.health_unit) {
      throw new ApiError(403, 'A unidade deve ser alterada pelo administrador.');
    }

    if (updates.cpf !== undefined) {
      if (!updates.cpf) {
        updates.cpf = null;
      } else {
        const digits = onlyDigits(updates.cpf);
        if (digits.length !== 11) {
          throw new ApiError(400, 'CPF deve conter 11 digitos.');
        }
        updates.cpf = digits;
      }
    }

    if (updates.phone !== undefined && updates.phone) {
      updates.phone = updates.phone.trim() || null;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    await logAudit({
      req,
      action: 'profile.update',
      entity: 'profiles',
      entityId: req.user.id,
      metadata: { fields: Object.keys(updates) }
    });

    return ok(res, data);
  })
);

router.post(
  '/avatar',
  requireAuth,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, 'Selecione uma imagem para enviar.');
    }

    if (!hasImageSignature(req.file.buffer, req.file.mimetype)) {
      throw new ApiError(400, 'O arquivo nao corresponde a uma imagem JPG, PNG ou WebP valida.');
    }
    const extension = ALLOWED_IMAGE_TYPES[req.file.mimetype];
    const objectPath = `${req.user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new ApiError(400, `Falha no upload da foto: ${uploadError.message}`);
    }

    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from('avatars').getPublicUrl(objectPath);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      await supabaseAdmin.storage.from('avatars').remove([objectPath]);
      throw new ApiError(400, error.message);
    }

    const previousUrl = req.profile.avatar_url;
    if (previousUrl?.includes('/avatars/')) {
      const previousPath = previousUrl.split('/avatars/')[1];
      if (previousPath?.startsWith(`${req.user.id}/`)) {
        await supabaseAdmin.storage.from('avatars').remove([previousPath]);
      }
    }

    await logAudit({
      req,
      action: 'profile.avatar_update',
      entity: 'profiles',
      entityId: req.user.id,
      metadata: { path: objectPath }
    });

    return ok(res, data);
  })
);

export default router;
