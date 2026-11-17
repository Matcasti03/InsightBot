import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { api } from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/utils';
import type { Profile } from '../types';

interface SignUpInput {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ requiresConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (profile: Profile) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const authVersionRef = useRef(0);
  const profileRequestRef = useRef(0);

  const fetchProfile = useCallback(async () => {
    const version = authVersionRef.current;
    const request = ++profileRequestRef.current;
    const me = await api.get<Profile>('/me');
    if (version === authVersionRef.current && request === profileRequestRef.current) setProfile(me);
    return me;
  }, []);

  const handleSession = useCallback(
    async (nextSession: Session | null) => {
      const version = ++authVersionRef.current;
      setSession(nextSession);
      setProfile((current) => current?.id === nextSession?.user.id ? current : null);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await fetchProfile();
        if (version === authVersionRef.current) setAuthError(null);
      } catch (error) {
        if (version !== authVersionRef.current) return;
        setProfile(null);
        setAuthError(error instanceof Error ? error.message : 'Falha ao carregar o perfil.');
        await supabase.auth.signOut();
      } finally {
        if (version === authVersionRef.current) setLoading(false);
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    const initialVersion = authVersionRef.current;
    supabase.auth.getSession().then(({ data }) => {
      if (active && initialVersion === authVersionRef.current) void handleSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      const version = ++authVersionRef.current;
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (nextSession) {
        setSession(nextSession);
        setProfile((current) => current?.id === nextSession.user.id ? current : null);
        window.setTimeout(() => {
          if (!active || version !== authVersionRef.current) return;
          void fetchProfile()
          .then(() => { if (version === authVersionRef.current) setAuthError(null); })
          .catch(async (error) => {
            if (!active || version !== authVersionRef.current) return;
            setAuthError(error instanceof Error ? error.message : 'Falha ao carregar o perfil.');
            await supabase.auth.signOut();
          })
          .finally(() => { if (active && version === authVersionRef.current) setLoading(false); }); }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      authVersionRef.current++;
      subscription.unsubscribe();
    };
  }, [fetchProfile, handleSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(authErrorMessage(error.message));

      const version = ++authVersionRef.current;
      setSession(data.session);
      setProfile(null);
      setLoading(true);
      try {
        await fetchProfile();
        setAuthError(null);
      } catch (profileError) {
        if (version !== authVersionRef.current) return;
        await supabase.auth.signOut();
        setProfile(null);
        const message =
          profileError instanceof Error ? profileError.message : 'Falha ao carregar o perfil.';
        setAuthError(message);
        throw new Error(message);
      } finally {
        if (version === authVersionRef.current) setLoading(false);
      }
    },
    [fetchProfile]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.full_name,
            phone: input.phone ?? null
          }
        }
      });

      if (error) throw new Error(authErrorMessage(error.message));

      if (data.session) {
        const version = ++authVersionRef.current;
        setSession(data.session);
        setProfile(null);
        setLoading(true);
        try {
          await fetchProfile();
        } finally {
          if (version === authVersionRef.current) setLoading(false);
        }
        return { requiresConfirmation: false };
      }

      return { requiresConfirmation: true };
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    authVersionRef.current++;
    setProfile(null);
    setSession(null);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      return await fetchProfile();
    } catch {
      return null;
    }
  }, [fetchProfile]);

  const updateProfile = useCallback((nextProfile: Profile) => {
    setProfile(nextProfile);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      authError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      clearAuthError
    }),
    [
      session,
      profile,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      clearAuthError
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
