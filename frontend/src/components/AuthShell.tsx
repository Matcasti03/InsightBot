import { motion } from 'framer-motion';
import { Activity, BatteryCharging, Lock, ShieldCheck, Signal, Wifi } from 'lucide-react';

const FEATURES = [
  {
    icon: Activity,
    title: 'Telemetria em tempo real',
    description: 'Bateria, temperatura, pH e sinal da capsula monitorados continuamente.'
  },
  {
    icon: ShieldCheck,
    title: 'Biopisia com dupla confirmacao',
    description: 'Cada coleta exige validacao medica e gera trilha de auditoria completa.'
  },
  {
    icon: Lock,
    title: 'Privacidade por design',
    description: 'Dados sensiveis protegidos com RLS e mascaramento conforme a LGPD.'
  }
];

export default function AuthShell({
  children,
  footer
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-app">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full bg-accent/15 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16">
        <div className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/25">
                <Activity className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-accent ring-2 ring-app" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight text-main">InSightBot</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  EliteDevs HealthTech
                </p>
              </div>
            </div>

            <h1 className="mt-10 max-w-lg text-4xl font-extrabold leading-[1.1] tracking-tight text-main">
              Endoscopia por capsula robotica,{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                perto de quem precisa.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
              Democratizamos o exame digestivo levando navegacao magnetica, telemetria e laudo
              especializado para UBSs e clinicas do interior.
            </p>

            <div className="relative mt-10 h-64">
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [-24, -20, -24] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-1/2 top-1/2 flex h-28 w-64 -translate-x-1/2 -translate-y-1/2 items-center"
              >
                <div className="h-full w-1/2 rounded-l-full border-2 border-white/30 bg-gradient-to-br from-white/95 to-sky-100 shadow-2xl shadow-primary/30" />
                <div className="relative h-full w-1/2 rounded-r-full border-2 border-primary/40 bg-gradient-to-br from-primary to-cyan-300 shadow-2xl shadow-primary/40">
                  <span className="absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.9)]" />
                  <span className="absolute inset-3 rounded-r-full bg-gradient-to-t from-white/30 to-transparent" />
                </div>
                <span className="absolute -inset-6 -z-10 rounded-full bg-primary/20 blur-2xl" />
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="glass absolute left-0 top-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-main shadow-lg"
              >
                <BatteryCharging className="h-4 w-4 text-accent" /> 87%
              </motion.div>
              <motion.div
                animate={{ y: [0, 9, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                className="glass absolute bottom-3 left-8 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-main shadow-lg"
              >
                <Wifi className="h-4 w-4 text-primary" /> Sinal 94%
              </motion.div>
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="glass absolute bottom-6 right-0 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-main shadow-lg"
              >
                <Signal className="h-4 w-4 text-accent" /> pH 6.8
              </motion.div>
            </div>

            <div className="mt-6 grid gap-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-main">{feature.title}</p>
                      <p className="text-xs text-muted">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-main">InSightBot</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
                EliteDevs HealthTech
              </p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">{children}</div>
          {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
