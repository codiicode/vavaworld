/**
 * The shared backdrop for every (app) page. Matches the landing page and
 * the map: near-black with a slow blue wash, so moving between the
 * marketing site and the app feels like one product rather than two.
 */
export function GlowBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#000000]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(50% 40% at 16% 12%, rgba(60, 110, 220, 0.055), transparent 72%),
            radial-gradient(46% 36% at 88% 78%, rgba(90, 140, 255, 0.045), transparent 70%)
          `,
        }}
      />
    </div>
  );
}
