import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type Tone = 'primary' | 'accent' | 'warning' | 'danger' | 'muted';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  muted: 'bg-panel text-muted'
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  delay?: number;
}

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  delay = 0
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-main">{value}</p>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className="mt-3 truncate text-xs text-muted">{hint}</p>}
    </motion.div>
  );
}
