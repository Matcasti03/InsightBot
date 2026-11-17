import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(), getSession: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void), signOut: vi.fn()
}));
vi.mock('../src/lib/api', () => ({ api: { get: mocks.get } }));
vi.mock('../src/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { auth: {
  getSession: mocks.getSession, signOut: mocks.signOut,
  onAuthStateChange: (listener: typeof mocks.listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; }
} } }));
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
function Probe() { const { profile, session } = useAuth(); return <div>{session?.user.id ?? 'signed-out'}:{profile?.id ?? 'no-profile'}</div>; }

test('resposta de perfil atrasada nao restaura dados depois do logout', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let resolveProfile!: (value: unknown) => void;
  mocks.get.mockReturnValue(new Promise(resolve => { resolveProfile = resolve; }));
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'old-user' } } } });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
    await act(async () => mocks.listener?.('SIGNED_OUT', null));
    await act(async () => resolveProfile({ id: 'old-user', full_name: 'Old User' }));
    expect(container.textContent).toBe('signed-out:no-profile');
  } finally { await act(async () => root.unmount()); container.remove(); }
});
