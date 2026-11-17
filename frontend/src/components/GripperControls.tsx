import { RotateCcw, Scissors } from 'lucide-react';
import { DEFAULT_GRIPPER, type GripperState } from '../lib/microGripper';

interface Props {
  value: GripperState;
  onChange: (value: GripperState) => void;
  disabled?: boolean;
}

const AXES = [
  { key: 'x', label: 'Horizontal da garra', min: -1, max: 1, step: 0.05 },
  { key: 'y', label: 'Vertical da garra', min: -1, max: 1, step: 0.05 },
  { key: 'extension', label: 'Avanco da garra', min: 0, max: 1, step: 0.05 },
  { key: 'rotation', label: 'Rotacao da garra', min: -180, max: 180, step: 5 },
  { key: 'opening', label: 'Abertura da garra', min: 0, max: 1, step: 0.05 }
] as const;

export default function GripperControls({ value, onChange, disabled }: Props) {
  return <section className="rounded-xl border border-primary/25 bg-primary/5 p-3" aria-label="Controles da garra virtual">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-main"><Scissors className="h-4 w-4 text-primary" /> Garra de microcoleta</p>
        <p className="mt-1 text-[11px] text-muted">Instrumento virtual visivel na camera e no 3D.</p>
      </div>
      <button type="button" className="btn-secondary" disabled={disabled} aria-pressed={value.enabled}
        onClick={() => onChange({ ...value, enabled: !value.enabled })}>
        {value.enabled ? 'Recolher garra' : 'Ativar garra'}
      </button>
    </div>
    {value.enabled && <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {AXES.map(axis => <label key={axis.key} className="block text-[11px] font-semibold text-muted">
          <span className="mb-1 flex justify-between gap-2">{axis.label}
            <span className="tabular-nums text-main">{axis.key === 'rotation' ? `${value[axis.key]}°` : `${Math.round(value[axis.key] * 100)}%`}</span>
          </span>
          <input aria-label={axis.label} type="range" min={axis.min} max={axis.max} step={axis.step}
            value={value[axis.key]} disabled={disabled} className="w-full accent-sky-500"
            onChange={event => onChange({ ...value, [axis.key]: Number(event.target.value) })} />
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={disabled} onClick={() => onChange({ ...value, opening: value.opening > 0 ? 0 : 1 })}>
          {value.opening > 0 ? 'Fechar garra' : 'Abrir garra'}
        </button>
        <button type="button" className="btn-ghost" disabled={disabled} onClick={() => onChange({ ...DEFAULT_GRIPPER, enabled: true })}>
          <RotateCcw className="h-3.5 w-3.5" /> Centralizar garra
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-muted">Mover ou fechar a garra apenas anima o instrumento. A coleta exige a confirmacao de biopsia abaixo.</p>
    </div>}
  </section>;
}
