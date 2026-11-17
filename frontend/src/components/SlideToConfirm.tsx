import { useRef, useState } from 'react';
import { Check, ChevronsRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface SlideToConfirmProps {
  label: string;
  completedLabel?: string;
  disabled?: boolean;
  onComplete: () => void;
}

const KNOB_SIZE = 48;
const PADDING = 4;

export default function SlideToConfirm({
  label,
  completedLabel = 'Confirmacao armada',
  disabled,
  onComplete
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const pointerRef = useRef<number | null>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);

  const maxTravel = () => Math.max(0, (trackRef.current?.clientWidth ?? 0) - KNOB_SIZE - PADDING * 2);

  const updatePosition = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const next = Math.min(
      maxTravel(),
      Math.max(0, clientX - rect.left - PADDING - KNOB_SIZE / 2)
    );
    xRef.current = next;
    setX(next);
  };

  const finish = () => {
    if (pointerRef.current === null || completed) return;
    pointerRef.current = null;
    setDragging(false);
    const max = maxTravel();
    if (max > 0 && xRef.current >= max * 0.85) {
      xRef.current = max;
      setX(max);
      setCompleted(true);
      onComplete();
    } else {
      xRef.current = 0;
      setX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={(event) => {
        if (disabled || completed || event.button !== 0 || pointerRef.current !== null) return;
        const start = event.clientX - event.currentTarget.getBoundingClientRect().left;
        if (start < PADDING || start > PADDING + KNOB_SIZE) return;
        pointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        updatePosition(event.clientX);
      }}
      onPointerMove={(event) => {
        if (pointerRef.current === event.pointerId && !completed && !disabled) updatePosition(event.clientX);
      }}
      onPointerUp={(event) => { if (pointerRef.current === event.pointerId) finish(); }}
      onPointerCancel={() => {
        pointerRef.current = null;
        setDragging(false);
        xRef.current = 0;
        setX(0);
      }}
      className={cn(
        'relative h-14 w-full touch-none select-none overflow-hidden rounded-xl border transition-colors',
        completed
          ? 'border-accent/50 bg-accent/15'
          : 'border-danger/30 bg-danger/5',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-lg transition-colors',
          completed ? 'bg-accent/20' : 'bg-danger/15'
        )}
        style={{ width: x + KNOB_SIZE + PADDING }}
      />
      <span
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center pl-8 text-xs font-bold uppercase tracking-wider',
          completed ? 'text-accent' : 'text-danger/80'
        )}
      >
        {completed ? completedLabel : label}
      </span>
      <div
        className={cn(
          'absolute top-1 flex items-center justify-center rounded-lg text-white shadow-lg transition-colors',
          completed ? 'bg-accent' : 'bg-danger'
        )}
        style={{
          left: PADDING,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease'
        }}
      >
        {completed ? <Check className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
      </div>
    </div>
  );
}
