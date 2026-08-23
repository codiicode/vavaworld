/**
 * Clean white background with a soft radial glow - the shared backdrop for the
 * (app) pages (portfolio, profile, marketplace, etc.). Fixed so it stays put on
 * scroll; sits behind everything.
 */
export function GlowBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-white dark:bg-[#0a101f]">
      <div
        className="absolute inset-0 opacity-40 dark:opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #93c5fd 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
