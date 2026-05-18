import { Globe } from 'lucide-react';

/**
 * Real SVG country flag (via the bundled `flag-icons` set) instead of an
 * emoji. Emoji flags don't render on Windows/Chrome — they fall back to the
 * two-letter code ("SE", "US") — so we never use emoji for flags anywhere.
 *
 * `code` is an ISO 3166-1 alpha-2 code in any case ("se", "SE"). Anything
 * missing or malformed renders a neutral globe placeholder.
 */
export function Flag({
  code,
  size = 16,
  className = '',
  title,
}: {
  code?: string | null;
  size?: number;
  className?: string;
  title?: string;
}) {
  const cc = typeof code === 'string' ? code.trim().toLowerCase() : '';
  const valid = /^[a-z]{2}$/.test(cc);
  const h = size;
  const w = Math.round((size * 4) / 3);
  const radius = Math.max(2, Math.round(size * 0.16));

  if (!valid) {
    return (
      <span
        aria-hidden
        className={className}
        title={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: w,
          height: h,
          flex: 'none',
          borderRadius: radius,
          background: 'rgba(120,140,170,0.16)',
          color: 'rgba(70,90,120,0.7)',
          verticalAlign: 'middle',
        }}
      >
        <Globe size={Math.round(size * 0.78)} strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={`fi fi-${cc} ${className}`}
      title={title}
      aria-label={title ?? cc.toUpperCase()}
      role="img"
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        flex: 'none',
        borderRadius: radius,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)',
        verticalAlign: 'middle',
      }}
    />
  );
}
