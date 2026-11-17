import { Pill } from 'lucide-react';
import { cn } from '../lib/utils';

export function FullPageLoader({ label = 'Carregando ambiente seguro...' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app text-main">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl border border-primary/40" />
        <Pill className="h-8 w-8" />
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-[shimmer_1.4s_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4 p-5">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-8 w-20" />
      <SkeletonBlock className="h-3 w-full" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-72 p-5 lg:col-span-2">
          <SkeletonBlock className="h-full w-full" />
        </div>
        <div className="card h-72 p-5">
          <SkeletonBlock className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
