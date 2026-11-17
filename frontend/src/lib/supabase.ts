import { localAuthClient } from './localAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isLocalMode = import.meta.env.VITE_DATA_PROVIDER !== 'supabase';
export const isSupabaseConfigured = isLocalMode || Boolean(supabaseUrl && supabaseAnonKey &&
  !/SEU-PROJETO/i.test(supabaseUrl) && supabaseAnonKey !== 'sua-anon-key');

export const supabase = isLocalMode ? localAuthClient : createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
