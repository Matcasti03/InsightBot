import type { GripperState } from '../lib/microGripper';
import DigestiveScene from './DigestiveScene';
import type { SimulationMotion } from '../lib/digestiveSimulation';
import { useEffect, useState, type MutableRefObject } from 'react';
import { Bot, Crosshair, Wifi } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AiFinding } from '../types';

interface SimulatedFeedProps {
  findings: AiFinding[];
  aiEnabled: boolean;
  capsuleId: string;
  signal?: number;
  position?: string;
  look: { x: number; y: number; z?: number; rotation?: number };
  motion?: MutableRefObject<SimulationMotion>;
  active?: boolean;
  gripper?: GripperState;
}

export default function SimulatedFeed({
  findings,
  aiEnabled,
  capsuleId,
  signal,
  position,
  look,
  active = true,
  motion,
  gripper
}: SimulatedFeedProps) {
  const [timestamp, setTimestamp] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleFindings = aiEnabled
    ? findings.filter((finding) => finding.status !== 'descartado')
    : [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <DigestiveScene view="endoscopic" orientation={look} active={active} motion={motion} gripper={gripper} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-3 text-[10px] font-semibold text-white/85">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={cn("absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70", active && "animate-ping")} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          {active ? 'SIMULACAO · EM MOVIMENTO' : 'SIMULACAO · PAUSADA'}
        </span>
        <span className="rounded-md bg-black/30 px-2 py-0.5 tracking-wider">
          {capsuleId}
        </span>
        <span className="tabular-nums">{timestamp.toLocaleTimeString('pt-BR')}</span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-[10px] font-semibold text-white/80">
        <span className="flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-cyan-300" /> Sinal {signal ?? '—'}%
        </span>
        <span className="rounded-md bg-black/30 px-2 py-0.5">{position ?? 'Mapeando...'}</span>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <Crosshair className="h-7 w-7 text-white/35" />
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-white/20" />
        </div>
      </div>

      {gripper?.enabled && <div className="pointer-events-none absolute right-3 top-12 rounded-md border border-white/25 bg-black/50 px-2 py-1 text-[9px] font-semibold text-white">GARRA · {gripper.opening > 0 ? 'ABERTA' : 'FECHADA'}</div>}

      {aiEnabled && (
        <div className="pointer-events-none absolute left-3 top-12 flex items-center gap-1.5 rounded-md border border-cyan-300/40 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
          <Bot className="h-3 w-3" /> IA de apoio ativa
        </div>
      )}

      {visibleFindings.map((finding) => (
        <div
          key={finding.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${finding.x ?? 50}%`, top: `${finding.y ?? 50}%` }}
        >
          <div
            className={cn(
              'relative h-20 w-24 rounded-lg border-2',
              finding.status === 'confirmado'
                ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.45)]'
                : 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
            )}
          >
            <span
              className={cn(
                'absolute -left-0.5 -top-0.5 h-2.5 w-2.5 border-l-2 border-t-2',
                finding.status === 'confirmado' ? 'border-emerald-400' : 'border-amber-300'
              )}
            />
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-b-2 border-r-2',
                finding.status === 'confirmado' ? 'border-emerald-400' : 'border-amber-300'
              )}
            />
          </div>
          <div
            className={cn(
              'mt-1 w-max max-w-[150px] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950',
              finding.status === 'confirmado' ? 'bg-emerald-400' : 'bg-amber-300'
            )}
          >
            {finding.label} · {finding.confidence}%
          </div>
        </div>
      ))}
    </div>
  );
}
