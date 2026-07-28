import { Hexes } from '@/components/ui/background-hexes';

// Temporary preview of the hex-grid background (Aceternity background-boxes,
// re-shaped into VavaWorld hexes, hex.jpg light-grey theme). Throwaway route.
export default function HexDemoPage() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#eceff4]">
      {/* light-grey gaps between the white hexes read as the grid lines.
          Radial mask fades the grid out at the edges into the page colour. */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-[#eceff4] [mask-image:radial-gradient(transparent,white)]" />
      <Hexes />
      <h1 className="relative z-20 text-xl text-[#0b1a2e] md:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
        One hundred million cells.
      </h1>
      <p className="relative z-20 mt-2 text-center text-[#5b7088]">
        Hover the grid - each hex lights up.
      </p>
    </div>
  );
}
