/* eslint-disable @next/next/no-img-element */
/**
 * VAVAWORLD globe mark, alpha-transparent PNGs extracted from the brand
 * masters in /content:
 * - "white" (public/logo-globe-white.png): for dark surfaces
 * - "color" (public/logo-globe-color.png): blue/dark split, for light surfaces
 *
 * Background-free, cut tight to the mark. Rendered `contain` in a square box.
 */
export function BrandLogo({
  size = 28,
  variant = 'white',
  className = '',
}: {
  size?: number;
  variant?: 'white' | 'color';
  className?: string;
}) {
  return (
    <img
      src={variant === 'color' ? '/logo-globe-color.png' : '/logo-globe-white.png'}
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
