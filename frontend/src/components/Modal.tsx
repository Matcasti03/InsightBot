import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Fechar modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line/70 bg-surface shadow-2xl sm:rounded-3xl',
              SIZES[size]
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-line/60 p-5 sm:p-6">
                <div>
                  {title && <h2 className="text-lg font-bold text-main">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-muted transition hover:bg-panel hover:text-main"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-3 border-t border-line/60 bg-panel/40 p-5 sm:flex-row sm:justify-end sm:p-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
