import type { Session, SupabaseClient, AuthChangeEvent } from '@supabase/supabase-js';
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const KEY = 'insightbot-local-session';
const listeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();
let session: Session | null = null;
try { session = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { /* No saved session. */ }
function setSession(value: Session | null) {
  session = value;
  try { if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY); } catch { /* Session still works in memory. */ }
  for (const listener of listeners) listener(value ? 'SIGNED_IN' : 'SIGNED_OUT', value);
}
async function authenticate(path: string, body: unknown) {
  try {
    const response = await fetch(`${API_URL}/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) return { data: { session: null, user: null }, error: { message: payload.error ?? 'Falha na autenticacao.' } };
    setSession(payload.data);
    return { data: { session, user: session?.user }, error: null };
  } catch { return { data: { session: null, user: null }, error: { message: 'Nao foi possivel conectar a API local.' } }; }
}
// Keep the auth interface used by the application identical across both providers.
export const localAuthClient = { auth: {
  async getSession() {
    if (session?.expires_at && session.expires_at * 1000 <= Date.now()) setSession(null);
    return { data: { session }, error: null };
  },
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  signInWithPassword: (body: { email: string; password: string }) => authenticate('login', body),
  signUp: (body: { email: string; password: string; options: { data: Record<string, unknown> } }) => authenticate('register', { email: body.email, password: body.password, ...body.options.data }),
  async signOut() {
    const token = session?.access_token;
    try {
      if (token) await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch { /* Clear the local session even if the API is offline. */ }
    finally { setSession(null); }
    return { error: null };
  }
} } as unknown as SupabaseClient;
