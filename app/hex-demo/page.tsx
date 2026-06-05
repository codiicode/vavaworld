import { Hexes } from '@/components/ui/background-hexes';

// Temporary preview of the hex-grid background (Aceternity background-boxes,
// re-shaped into VavaWorld hexes). Throwaway route for review.
export default function HexDemoPage() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#070d18]">
      {/* radial mask so the grid fades at the edges */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-[#070d18] [mask-image:radial-gradient(transparent,white)]" />
      <Hexes />
      <h1 className="relative z-20 text-xl text-white md:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
        One hundred million cells.
      </h1>
      <p className="relative z-20 mt-2 text-center text-neutral-300">
        Hover the grid - each hex lights up in teal.
      </p>
    </div>
  );
}
