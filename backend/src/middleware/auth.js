import { supabaseAdmin } from '../lib/supabase.js';
import { ApiError } from '../lib/http.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Token de autenticacao ausente.');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      throw new ApiError(401, 'Sessao invalida ou expirada.');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new ApiError(500, 'Falha ao carregar o perfil do usuario.');
    }
    if (!profile) {
      throw new ApiError(403, 'Perfil nao encontrado.');
    }
    if (profile.status !== 'ativo') {
      throw new ApiError(403, 'Conta inativa ou pendente de aprovacao do administrador.');
    }

    req.user = data.user;
    req.profile = profile;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return next(new ApiError(403, 'Voce nao possui permissao para esta acao.'));
    }
    return next();
  };
}

export const STAFF_ROLES = ['superadmin', 'medico', 'operador_ubs'];
export const CLINICAL_ROLES = ['superadmin', 'medico'];
