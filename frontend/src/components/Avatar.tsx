import { useEffect, useState } from 'react';
import { cn, initials } from '../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl'
};

export default function Avatar({ src, name = '', size = 'md', className, ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent font-bold text-white',
        SIZES[size],
        ring && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-surface',
        className
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name || 'Foto de perfil'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
