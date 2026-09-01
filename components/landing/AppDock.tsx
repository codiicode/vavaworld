'use client';

/**
 * The persistent app chrome. Once the hero is behind you this takes over
 * from the transparent hero nav and follows you down the page, carrying
 * the section you are in, live world state, and the primary action - so
 * the page reads as an application rather than a document.
 */

import { BrandLogo } from '@/components/brand-logo';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLandingStats } from '@/lib/use-landing-stats';

/** Sections it can highlight, in page order. */
const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'token', label: '$VAVA' },
  { id: 'rules', label: 'Rules' },
  { id: 'board', label: 'Leaderboard' },
];

export function AppDock() {
  const stats = useLandingStats();
  const [on, setOn] = useState(false);
  const [read, setRead] = useState(0);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    let ticking = false;

    const measure = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight || 1;

      // Show once the hero is essentially behind us.
      setOn(y > vh * 0.72);

      // Reading progress across the whole document.
      const max = document.documentElement.scrollHeight - vh;
      setRead(max > 0 ? Math.min(Math.max((y / max) * 100, 0), 100) : 0);

      // Which section is under the top third of the viewport.
      let current = '';
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= vh * 0.34) current = s.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={`app-dock ${on ? 'on' : ''}`} aria-hidden={!on}>
      <Link href="/" className="dock-mark">
        <BrandLogo size={20} variant="white" />
        <span
          className="hidden text-[11px] lg:inline"
          style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
        >
          VAVAWORLD
        </span>
      </Link>

      <nav className="dock-links">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'active' : ''}>
            {s.label}
          </a>
        ))}
      </nav>

      <span className="dock-live">
        <b>{stats ? stats.claimedToday.toLocaleString('en-US') : ' - '}</b>
        claimed today
      </span>

      <Link href="/map" className="dock-cta">
        Claim a hex
      </Link>

      <span className="dock-progress" aria-hidden>
        <i style={{ ['--read' as string]: `${read}%` }} />
      </span>
    </div>
  );
}
