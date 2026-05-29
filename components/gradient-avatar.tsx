import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Avatar whose fallback is a deterministic two-stop gradient derived from a
 * seed (wallet address or handle), so every user gets a distinct, stable
 * color instead of everyone sharing the same flat `primary/20` tint.
 */
function hueFromSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function GradientAvatar({
  seed,
  initial,
  src,
  className,
  textClassName,
}: {
  seed: string;
  initial: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const h1 = hueFromSeed(seed);
  const h2 = (h1 + 48) % 360;
  const gradient = `linear-gradient(135deg, hsl(${h1} 70% 58%), hsl(${h2} 72% 46%))`;

  return (
    <Avatar className={cn('ring-2 ring-white/50', className)}>
      {src && <AvatarImage src={src} alt={initial} />}
      <AvatarFallback
        className={cn(
          'font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]',
          textClassName,
        )}
        style={{ backgroundImage: gradient }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
