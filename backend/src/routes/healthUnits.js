import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError, asyncHandler, ok } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('health_units')
      .select('id, name, city, state, type, active')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw new ApiError(400, error.message);
    return ok(res, data ?? []);
  })
);

export default router;
