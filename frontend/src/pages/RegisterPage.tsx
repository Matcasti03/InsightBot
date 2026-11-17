import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Phone,
  UserRound
} from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { FullPageLoader } from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function RegisterPage() {
  const { session, profile, loading, configured, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  if (loading) return <FullPageLoader label="Preparando cadastro..." />;
  if (session && profile) return <Navigate to="/" replace />;

  const checks = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password) && /[a-z]/.test(form.password),
    /\d/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password)
  ];
  const strength = checks.filter(Boolean).length;

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!accepted) {
      setError('E necessario aceitar a politica de privacidade e protecao de dados.');
      return;
    }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      setError('Use no minimo 8 caracteres, com maiuscula, minuscula, numero e simbolo.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('As senhas informadas nao coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim()
      });
      if (result.requiresConfirmation) {
        setRequiresConfirmation(true);
        return;
      }
      toast.success('Conta criada', 'Bem-vindo ao InSightBot.');
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (requiresConfirmation) {
    return (
      <AuthShell
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Voltar para o login
          </Link>
        }
      >
        <div className="py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-accent">
            <MailCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold tracking-tight">Confirme seu e-mail</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Enviamos um link de confirmacao para <strong className="text-main">{form.email}</strong>.
            Após confirmar, volte e faça login para acessar seus exames.
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full">
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      footer={
        <>
          Ja possui conta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Fazer login
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <span className="badge bg-accent/10 text-accent">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Cadastro de paciente
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-main">Crie sua conta</h2>
        <p className="mt-1 text-sm text-muted">
          Acompanhe preparo, exames e laudos sem sair da sua cidade.
        </p>
      </div>

      {!configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Supabase nao configurado. Preencha o arquivo frontend/.env antes de cadastrar.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="label">
            Nome completo
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="full_name"
              required
              autoComplete="name"
              value={form.full_name}
              onChange={update('full_name')}
              placeholder="Seu nome completo"
              className="input pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="voce@email.com"
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Telefone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="(00) 00000-0000"
                className="input pl-10"
              />
            </div>
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
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              placeholder="Minimo de 8 caracteres"
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
          <div className="mt-2 flex gap-1.5">
            {checks.map((check, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  check ? (strength >= 3 ? 'bg-accent' : 'bg-warning') : 'bg-line'
                }`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Use maiuscula, minuscula, numero e um caractere especial.
          </p>
        </div>

        <div>
          <label htmlFor="confirm" className="label">
            Confirmar senha
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="Repita a senha"
              className="input pl-10"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary/40"
          />
          <span>
            Autorizo o uso dos meus dados para realizacao e acompanhamento do exame, conforme a
            LGPD e a politica de privacidade do InSightBot.
          </span>
        </label>

        <button type="submit" disabled={submitting || !configured} className="btn-primary w-full py-3">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Criando conta...
            </>
          ) : (
            'Criar minha conta'
          )}
        </button>

        <p className="text-center text-[11px] text-muted">
          Cadastros publicos sao criados com perfil <strong className="text-main">Paciente</strong>.
          Perfis clinicos sao liberados pelo administrador.
        </p>
      </form>
    </AuthShell>
  );
}
