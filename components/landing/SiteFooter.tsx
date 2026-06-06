import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Hexes } from '@/components/ui/background-hexes';

export function SiteFooter() {
  return (
    <footer className="l-site" style={{ position: 'relative', overflow: 'hidden', background: '#eceff4' }}>
      {/* Hex grid background covering the whole footer (lights up on hover). */}
      <Hexes />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, #f3f8fb 0%, rgba(243,248,251,0) 22%)',
        }}
      />
      <div className="l-foot-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div className="l-foot-brand">
          <div className="l-brand l-dark">
            <span className="l-mark"><BrandLogo size={34} className="[filter:brightness(0)]" /></span>
            <span className="l-name" style={{ color: '#0b1a2e' }}>VAVAWORLD</span>
          </div>
          <p>A permanent record of the earth, divided by hand into one hundred million parts.</p>
        </div>
        <div className="l-foot-col">
          <h4>Work</h4>
          <ul>
            <li><Link href="/map">Buy land</Link></li>
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/how-it-works">How it works</Link></li>
          </ul>
        </div>
        <div className="l-foot-col">
          <h4>Studio</h4>
          <ul>
            <li><a href="#how">Notes</a></li>
            <li><a href="#how">Letter</a></li>
            <li><a href="#how">Press</a></li>
            <li><Link href="/map">Atlas</Link></li>
          </ul>
        </div>
        <div className="l-foot-col">
          <h4>Elsewhere</h4>
          <ul>
            <li><a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a></li>
            <li><a href="https://discord.com" target="_blank" rel="noreferrer">Discord</a></li>
            <li><a href="https://github.com/codiicode/vavaworld" target="_blank" rel="noreferrer">Github</a></li>
            <li><a href="#how">Documentation</a></li>
          </ul>
        </div>
      </div>
      <div className="l-foot-bottom" style={{ position: 'relative', zIndex: 1 }}>
        <span>© 2026 &nbsp;·&nbsp; Stockholm</span>
      </div>
    </footer>
  );
}
