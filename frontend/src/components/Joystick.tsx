import { useRef, useState } from 'react';
import { Move } from 'lucide-react';
import { cn } from '../lib/utils';

interface JoystickProps {
  onChange: (vector: { x: number; y: number }) => void;
  disabled?: boolean;
}

export default function Joystick({ onChange, disabled }: JoystickProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [vector, setVector] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const update = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const radius = rect.width / 2 - 28;
    let dx = clientX - rect.left - rect.width / 2;
    let dy = clientY - rect.top - rect.height / 2;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }
    const next = { x: dx / radius, y: dy / radius };
    setVector(next);
    onChange(next);
  };

  const reset = () => {
    setVector({ x: 0, y: 0 });
    setDragging(false);
    onChange({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={padRef}
        role="application"
        aria-label="Joystick de navegacao da capsula"
        onPointerDown={(event) => {
          if (disabled) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          update(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (dragging) update(event.clientX, event.clientY);
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
        className={cn(
          'relative h-40 w-40 touch-none select-none rounded-full border-2 border-line bg-panel/60 shadow-inner',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'
        )}
      >
        <div className="absolute inset-4 rounded-full border border-dashed border-line/70" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line/50" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-line/50" />
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] font-bold text-muted">
          Y-
        </span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-muted">
          Y+
        </span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted">
          X-
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted">
          X+
        </span>
        <div
          className={cn(
            'absolute left-1/2 top-1/2 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30',
            !dragging && 'transition-transform duration-200'
          )}
          style={{
            transform: `translate(calc(-50% + ${vector.x * 50}px), calc(-50% + ${vector.y * 50}px))`
          }}
        >
          <Move className="h-5 w-5" />
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Arraste ou use as setas
      </p>
    </div>
  );
}
