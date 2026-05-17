/**
 * VAVAWORLD sphere mark (public/logo.jpg).
 *
 * The source is a JPG with a white background. We don't have an image
 * pipeline here, so `mix-blend-mode: multiply` drops the white against the
 * light sky / light-glass backdrops it always sits on — pure white → fully
 * transparent, the soft grey vignette → a faint nothing. Square footprint,
 * cover-cropped + centered so the sphere fills the box without distortion.
 */
export function BrandLogo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="VAVAWORLD"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        backgroundImage: "url('/logo.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        mixBlendMode: 'multiply',
      }}
    />
  );
}
