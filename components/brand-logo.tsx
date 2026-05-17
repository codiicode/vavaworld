/* eslint-disable @next/next/no-img-element */
/**
 * VAVAWORLD sphere mark (public/vava-mark.png).
 *
 * Background-free, alpha-transparent PNG cut tight to the sphere — only the
 * blue hexagons, no white/grey backdrop. Rendered `contain` in a square box so
 * it sits cleanly on any surface (sky bg, light glass, dark footer).
 */
export function BrandLogo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/vava-mark.png"
      alt="VAVAWORLD"
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        objectFit: 'contain',
      }}
      className={className}
    />
  );
}
