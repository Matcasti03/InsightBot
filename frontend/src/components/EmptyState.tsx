import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/30 text-center ${
        compact ? 'gap-2 p-5' : 'gap-3 p-10'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-main">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
