/**
 * Map route-transition skeleton. The map chunk (Mapbox GL + tiles) is
 * the heaviest in the app; this paints the instant you navigate to
 * /map so the screen never freezes on the previous page while it loads.
 * Mirrors the map's full-bleed dark frame with the floating chrome
 * (search pill, right panel) as pulsing placeholders.
 */
export default function MapLoading() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0b1a2e]" aria-hidden>
      {/* Subtle map-tone gradient wash so it reads as "map loading". */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 40%, rgba(41,80,150,0.35) 0%, rgba(11,26,46,0) 70%)',
        }}
      />
      {/* Search pill */}
      <div className="absolute left-1/2 top-[18px] h-11 w-[min(520px,60vw)] -translate-x-1/2 animate-pulse rounded-full bg-white/15" />
      {/* Right glass panel */}
      <div className="absolute bottom-[18px] right-[18px] top-[18px] hidden w-[300px] animate-pulse rounded-[22px] bg-white/10 md:block" />
      {/* Zoom controls */}
      <div className="absolute bottom-[18px] left-1/2 h-11 w-40 -translate-x-1/2 animate-pulse rounded-full bg-white/12 md:left-[300px]" />
    </div>
  );
}
