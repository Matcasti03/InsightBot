import { useEffect, useState } from 'react';
import { Check, ClipboardCheck, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const STEPS = [
  {
    id: 'fasting',
    title: 'Jejum de 8 a 12 horas',
    description: 'Nao consuma alimentos solidos no periodo indicado pela equipe.'
  },
  {
    id: 'liquids',
    title: 'Liquidos claros ate 2 horas antes',
    description: 'Agua, cha claro e sucos coados sem residuos sao permitidos.'
  },
  {
    id: 'medication',
    title: 'Revisar medicamentos com a equipe',
    description: 'Informe uso continuo de anticoagulantes, ferro ou suplementos.'
  },
  {
    id: 'arrival',
    title: 'Chegar 30 minutos antes',
    description: 'Leve documento com foto, cartao SUS e pedido medico.'
  },
  {
    id: 'clothing',
    title: 'Roupas confortaveis e sem metais',
    description: 'Evite acessorios metalicos no dia do exame por seguranca magnetica.'
  }
];

const STORAGE_KEY = 'insightbot-prep-checklist';

export default function PrepChecklist() {
  const { profile } = useAuth();
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${profile?.id ?? 'anon'}`);
      setChecked(stored ? JSON.parse(stored) : {});
    } catch {
      setChecked({});
    }
    setLoadedFor(profile?.id ?? 'anon');
  }, [profile?.id]);

  useEffect(() => {
    if (loadedFor !== (profile?.id ?? 'anon')) return;
    try { localStorage.setItem(
      `${STORAGE_KEY}-${profile?.id ?? 'anon'}`,
      JSON.stringify(checked)
    );
    } catch { /* Storage may be disabled in private browsing. */ }
  }, [checked, profile?.id, loadedFor]);

  const completed = STEPS.filter((step) => checked[step.id]).length;
  const progress = Math.round((completed / STEPS.length) * 100);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="section-title">Preparo pre-exame</p>
            <p className="text-xs text-muted">{completed} de {STEPS.length} etapas concluidas</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setChecked({})}
          className="icon-btn h-8 w-8"
          aria-label="Reiniciar checklist"
          title="Reiniciar checklist"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {STEPS.map((step) => {
          const isChecked = Boolean(checked[step.id]);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() =>
                setChecked((current) => ({ ...current, [step.id]: !current[step.id] }))
              }
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                isChecked
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-line/60 bg-panel/30 hover:border-primary/30'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                  isChecked
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-surface text-transparent'
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    isChecked ? 'text-muted line-through' : 'text-main'
                  )}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  {step.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
