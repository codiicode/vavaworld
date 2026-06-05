import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export function SiteFooter() {
  return (
    <footer className="l-site">
      <div className="l-foot-inner">
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
      <div className="l-foot-bottom">
        <span>© 2026 &nbsp;·&nbsp; Stockholm</span>
      </div>
    </footer>
  );
}
