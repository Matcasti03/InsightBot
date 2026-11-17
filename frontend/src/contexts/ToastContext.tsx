import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

const STYLES: Record<ToastKind, string> = {
  success: 'border-accent/40 text-accent',
  error: 'border-danger/40 text-danger',
  info: 'border-primary/40 text-primary'
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { id, kind, title, description }]);
      window.setTimeout(() => remove(id), 4800);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (title, description) => push('success', title, description),
        error: (title, description) => push('error', title, description),
        info: (title, description) => push('info', title, description)
      }
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        <AnimatePresence>
          {toasts.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line/70 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl"
              >
                <div className={`mt-0.5 rounded-full border p-1.5 ${STYLES[item.kind]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-main">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="rounded-lg p-1 text-muted transition hover:bg-panel hover:text-main"
                  aria-label="Fechar notificacao"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
