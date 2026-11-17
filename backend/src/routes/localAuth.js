import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError, asyncHandler, ok, parseBody } from '../lib/http.js';

const router = Router();
router.use((req, res, next) => env.dataProvider === 'local' ? next() : next(new ApiError(404, 'Rota nao encontrada.')));
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, legacyHeaders: false, standardHeaders: 'draft-7', message: { error: 'Muitas tentativas. Aguarde alguns minutos.' } }));
const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });
router.post('/login', asyncHandler(async (req, res) => {
  const body = parseBody(credentials, req);
  const { login } = await import('../local/database.js');
  const session = login(body.email, body.password);
  if (!session) throw new ApiError(401, 'E-mail, senha ou conta invalidos.');
  return ok(res, session);
}));
router.post('/register', asyncHandler(async (req, res) => {
  const body = parseBody(credentials.extend({ full_name: z.string().trim().min(3).max(120), phone: z.string().max(30).nullable().optional() }), req);
  if (!/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/\d/.test(body.password) || !/[^a-zA-Z0-9]/.test(body.password)) {
    throw new ApiError(400, 'Use maiuscula, minuscula, numero e simbolo na senha.');
  }
  const { localClient, createSession } = await import('../local/database.js');
  const { data, error } = await localClient.auth.admin.createUser({ ...body, user_metadata: { full_name: body.full_name, phone: body.phone } });
  if (error) throw new ApiError(409, error.message);
  return ok(res, createSession(data.user), 201);
}));
router.post('/logout', asyncHandler(async (req, res) => {
  const { revokeSession } = await import('../local/database.js');
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (token) revokeSession(token);
  return ok(res, { signed_out: true });
}));
export default router;
