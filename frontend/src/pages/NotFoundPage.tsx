import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Pill, ShieldCheck } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25">
          <Pill className="h-8 w-8" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Erro 404</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-main sm:text-5xl">
          Fora de rota
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          A pagina que voce tentou acessar nao existe ou foi movida. Volte ao painel para
          continuar acompanhando os exames.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4" /> Voltar ao inicio
          </Link>
          <Link to="/login" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Ir para o login
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          InSightBot · ambiente clinico seguro
        </div>
      </div>
    </div>
  );
}
