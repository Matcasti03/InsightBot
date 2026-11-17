import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabaseAdmin = env.dataProvider === 'local'
  ? (await import('../local/database.js')).localClient
  : createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});
