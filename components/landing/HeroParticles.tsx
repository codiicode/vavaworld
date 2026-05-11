'use client';

import { useEffect, useRef } from 'react';

/**
 * Floating dust + sideways debris over the astronaut hero.
 * Generated once on mount so React doesn't churn 48 nodes on every render.
 */
export function HeroParticles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // upward floating dust
    for (let i = 0; i < 38; i++) {
      const s = document.createElement('span');
      const size = (Math.random() * 2.2 + 0.6).toFixed(2);
      const left = (Math.random() * 100).toFixed(2);
      const dur = (Math.random() * 18 + 16).toFixed(1);
      const delay = (-Math.random() * Number(dur)).toFixed(1);
      const op = (Math.random() * 0.5 + 0.4).toFixed(2);
      s.style.cssText = `width:${size}px;height:${size}px;left:${left}vw;bottom:-4vh;opacity:${op};animation:l-drift-up ${dur}s linear ${delay}s infinite;`;
      host.appendChild(s);
    }
    // sideways slow drift
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      const size = (Math.random() * 1.6 + 0.8).toFixed(2);
      const top = (Math.random() * 70 + 10).toFixed(2);
      const dur = (Math.random() * 40 + 50).toFixed(1);
      const delay = (-Math.random() * Number(dur)).toFixed(1);
      s.style.cssText = `width:${size}px;height:${size}px;top:${top}vh;left:-6vw;opacity:0.5;animation:l-drift-side ${dur}s linear ${delay}s infinite;`;
      host.appendChild(s);
    }
    return () => {
      host.innerHTML = '';
    };
  }, []);

  return <div ref={ref} className="l-particles" />;
}
