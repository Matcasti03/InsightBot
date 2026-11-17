import { isLocalMode } from '../lib/supabase';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { FullPageLoader } from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const DEMO_ACCOUNTS = [
  { label: 'Superadmin', email: 'admin@insightbot.dev', password: 'Insight@2026' },
  { label: 'Medico', email: 'medico@insightbot.dev', password: 'Insight@2026' },
  { label: 'Operador UBS', email: 'operador@insightbot.dev', password: 'Insight@2026' },
  { label: 'Paciente', email: 'ana@insightbot.dev', password: 'Insight@2026' }
];

export default function LoginPage() {
  const { session, profile, loading, configured, signIn, authError, clearAuthError } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (loading) return <FullPageLoader label="Verificando sessao segura..." />;
  if (session && profile) return <Navigate to={from} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearAuthError();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Bem-vindo de volta', 'Sessao iniciada com sucesso.');
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao entrar.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <AuthShell
      footer={
        <>
          Ainda nao possui conta?{' '}
          <Link to="/cadastro" className="font-semibold text-primary hover:underline">
            Criar cadastro de paciente
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <span className="badge bg-primary/10 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isLocalMode ? 'Demonstracao local' : 'Ambiente clinico seguro'}
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-main">Acesse o InSightBot</h2>
        <p className="mt-1 text-sm text-muted">
          Entre com suas credenciais para acompanhar exames, telemetria e laudos.
        </p>
      </div>

      {!configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Supabase nao configurado. Copie <code>frontend/.env.example</code> para{' '}
            <code>frontend/.env</code> e preencha as chaves do projeto.
          </span>
        </div>
      )}

      {(error || authError) && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@instituicao.com"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              className="input pl-10 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:text-main"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !configured}
          className="btn-primary w-full py-3"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
            </>
          ) : (
            'Entrar na plataforma'
          )}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-xl border border-line/70 bg-panel/50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            Acessos demo (apos npm run seed)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="rounded-lg border border-line/70 bg-surface px-2.5 py-2 text-left text-[11px] font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
