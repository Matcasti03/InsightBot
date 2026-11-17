import { supabaseAdmin } from './supabase.js';

export async function logAudit({ req, action, entity, entityId, metadata = {} }) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_id: req?.user?.id ?? null,
      actor_email: req?.profile?.email ?? req?.user?.email ?? null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      metadata,
      ip_address: req?.ip ?? null
    });
    if (error) throw error;
  } catch (error) {
    console.error('[audit] falha ao registrar evento', error?.message ?? error);
  }
}
