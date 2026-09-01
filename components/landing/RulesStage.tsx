'use client';

/**
 * The four rules on one pinned stage. Scroll scrubs between them: the
 * land cross-fades, the product card swaps, the copy slides. Four
 * separate bands meant four scroll-pasts; this makes it one sequence.
 */

import { useEffect, useRef, useState } from 'react';
import { ArtLoaded, ArtFloor, ArtShrink, ArtThrone } from './RuleArt';

type Rule = {
  n: string;
  figure: string;
  tone: string;
  unit: string;
  title: string;
  body: string;
  img: string;
  place: string;
  Art: () => JSX.Element;
};

const RULES: Rule[] = [
  {
    n: '01',
    figure: '15%',
    tone: 'blue',
    unit: 'of every claim, sealed inside',
    title: 'Every hex is loaded.',
    body: 'Claim a hex and 15% of what you paid buys $VAVA and locks it inside. Your land is not a deed - it carries treasure.',
    img: '/assets/land-1.jpg',
    place: 'Geirangerfjord, Norway',
    Art: ArtLoaded,
  },
  {
    n: '02',
    figure: '0',
    tone: '',
    unit: 'hexes can sell below floor',
    title: 'Your land has a floor.',
    body: 'Raze a hex whenever you like and walk away with the $VAVA inside it. That makes a hex impossible to sell for less than it holds.',
    img: '/assets/land-2.jpg',
    place: 'Grand Canyon, USA',
    Art: ArtFloor,
  },
  {
    n: '03',
    figure: '1.66T',
    tone: '',
    unit: 'hexes still unclaimed',
    title: 'The map only shrinks.',
    body: 'A claimed hex never returns to the pool. Every claim makes open ground rarer, and the price of that country climbs.',
    img: '/assets/land-3.jpg',
    place: 'Lake Louise, Canada',
    Art: ArtShrink,
  },
  {
    n: '04',
    figure: '5%',
    tone: 'gold',
    unit: 'of every claim on your soil',
    title: 'Take a throne. Defend it.',
    body: 'Hold enough of a country, stake 1,000,000 $VAVA, and the presidency is yours - until someone who out-owns you stages a coup.',
    img: '/assets/land-4.jpg',
    place: 'Namib Desert, Namibia',
    Art: ArtThrone,
  },
];

export function RulesStage() {
  const shell = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    let ticking = false;

    const measure = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = r.height - vh;
      if (total <= 0) return;
      const travelled = Math.min(Math.max(-r.top, 0), total);
      const p = travelled / total;
      const next = Math.min(RULES.length - 1, Math.floor(p * RULES.length * 1.001));
      setI((v) => (v === next ? v : next));
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
    <div ref={shell} className="rules-shell" style={{ height: `${RULES.length * 88}vh` }}>
      <div className="rules-stage">
        {/* Land + product card */}
        <div className="rules-art">
          {RULES.map((r, k) => (
            <div
              key={`plate-${r.n}`}
              aria-hidden
              className={`rules-plate ${i === k ? 'on' : ''}`}
              style={{ backgroundImage: `url(${r.img})` }}
            />
          ))}
          <div aria-hidden className="wash" />

          {RULES.map((r, k) => (
            <span key={`cap-${r.n}`} className={`land-cap ${i === k ? 'on' : ''}`}>
              {r.place}
            </span>
          ))}

          {RULES.map((r, k) => (
            <div key={`card-${r.n}`} className={`rules-card-slot ${i === k ? 'on' : ''}`}>
              <r.Art />
            </div>
          ))}
        </div>

        {/* Copy */}
        <div className="rules-side">
          {RULES.map((r, k) => (
            <div key={`copy-${r.n}`} className={`rules-copy ${i === k ? 'on' : ''}`}>
              <span className="idx">RULE {r.n}</span>
              <span className={`fig ${r.tone}`} style={{ display: 'block' }}>
                {r.figure}
              </span>
              <span className="unit" style={{ display: 'block' }}>
                {r.unit}
              </span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          ))}

          <div className="rules-rail" aria-hidden>
            {RULES.map((r, k) => (
              <i key={r.n} className={i === k ? 'on' : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
