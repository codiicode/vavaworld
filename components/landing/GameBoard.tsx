'use client';

/**
 * The standings. An earlier version put an abstract dot-map here, which
 * showed nothing a visitor could read. This is the actual information:
 * who owns the most ground, who holds each throne, and what just changed.
 */

import { useEffect, useState } from 'react';
import { Flag } from '@/components/flag';

const LEADERS = [
  { r: 1, cc: 'jp', name: '@shibuyaSam', tiles: '14,203', country: 'Japan', d: 0 },
  { r: 2, cc: 'se', name: '@nordicwhale', tiles: '11,840', country: 'Sweden', d: 2 },
  { r: 3, cc: 'fr', name: '@marais', tiles: '9,662', country: 'France', d: -1 },
  { r: 4, cc: 'ma', name: '@atlasmine', tiles: '8,104', country: 'Morocco', d: 1 },
  { r: 5, cc: 'us', name: '@harborline', tiles: '7,551', country: 'USA', d: -2 },
  { r: 6, cc: 'br', name: '@paulista', tiles: '6,930', country: 'Brazil', d: 3 },
];

const THRONES = [
  { cc: 'se', country: 'Sweden', holder: '@nordicwhale', held: '42d', state: 'held' },
  { cc: 'fr', country: 'France', holder: '@marais', held: '7d', state: 'contested' },
  { cc: 'jp', country: 'Japan', holder: '@shibuyaSam', held: '118d', state: 'held' },
  { cc: 'ma', country: 'Morocco', holder: '@atlasmine', held: '23d', state: 'held' },
  { cc: 'br', country: 'Brazil', holder: null, held: '—', state: 'open' },
  { cc: 'au', country: 'Australia', holder: '@reefline', held: '61d', state: 'held' },
];

const RECENT = [
  { cc: 'ma', who: '@atlasmine', what: 'claimed 320 tiles in', where: 'Casablanca', ago: '2m' },
  { cc: 'fr', who: '@marais', what: 'took the throne of', where: 'France', ago: '11m' },
  { cc: 'us', who: '@harborline', what: 'sold 40 tiles in', where: 'Chicago', ago: '18m' },
  { cc: 'se', who: '@nordicwhale', what: 'claimed 1,204 tiles in', where: 'Stockholm', ago: '24m' },
  { cc: 'jp', who: '@shibuyaSam', what: 'claimed 88 tiles in', where: 'Osaka', ago: '31m' },
];

export function GameBoard() {
  const [tab, setTab] = useState<'owners' | 'thrones'>('owners');
  const [top, setTop] = useState(0);

  // The activity list scrolls one row at a time.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setTop((v) => (v + 1) % RECENT.length), 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="board-wrap">
      {/* Standings */}
      <div className="board-main">
        <div className="board-tabs">
          <button type="button" data-on={tab === 'owners'} onClick={() => setTab('owners')}>
            Top landowners
          </button>
          <button type="button" data-on={tab === 'thrones'} onClick={() => setTab('thrones')}>
            Thrones · 249
          </button>
        </div>

        {tab === 'owners' ? (
          <div className="board-list">
            {LEADERS.map((row) => (
              <div key={row.name} className="brow">
                <span className="rank">{row.r}</span>
                <Flag code={row.cc} size={18} />
                <span className="name">
                  {row.name}
                  <em className="sub">{row.country}</em>
                </span>
                <span className="val">{row.tiles}</span>
                <span className={`delta ${row.d > 0 ? 'up' : row.d < 0 ? 'down' : 'flat'}`}>
                  {row.d > 0 ? `▲${row.d}` : row.d < 0 ? `▼${Math.abs(row.d)}` : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="board-list">
            {THRONES.map((t) => (
              <div key={t.country} className="brow">
                <Flag code={t.cc} size={18} />
                <span className="name">
                  {t.country}
                  <em className="sub">{t.holder ?? 'No president yet'}</em>
                </span>
                {t.state === 'contested' && <span className="pill contested">Contested</span>}
                {t.state === 'open' && <span className="pill open">Open</span>}
                <span className="val held">{t.held}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What just happened */}
      <div className="board-side">
        <div className="board-side-head">Latest moves</div>
        <div className="board-feed">
          {RECENT.map((e, i) => (
            <div
              key={e.who + e.where}
              className={`frow ${i === top ? 'now' : ''}`}
            >
              <Flag code={e.cc} size={16} />
              <span className="ftext">
                <b>{e.who}</b> {e.what} <span className="where">{e.where}</span>
              </span>
              <span className="fago">{e.ago}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
