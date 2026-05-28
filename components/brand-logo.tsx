/* eslint-disable @next/next/no-img-element */
/**
 * VAVAWORLD mark - white, alpha-transparent PNG (public/logga transparent.png).
 *
 * Background-free, cut tight to the mark - no backdrop. Rendered `contain` in a
 * square box so it sits cleanly on any surface. Used globally (landing nav +
 * footer, app sidebar, portfolio sidebar).
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
      src="/logga transparent.png"
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
