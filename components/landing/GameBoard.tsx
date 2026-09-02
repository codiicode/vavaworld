'use client';

/**
 * The standings - REAL data only. Top landowners come from the same
 * leaderboard the app uses, thrones from the live throne table, and the
 * feed from on-chain activity. An empty world says so honestly instead
 * of showing invented players.
 */

import { useEffect, useState } from 'react';
import { Flag } from '@/components/flag';
import { findCountry } from '@/lib/countries';

type Leader = {
  rank: number;
  username: string;
  country: string;
  hexes: number;
  countries: number;
};
type Throne = { country_iso: string; holder: string; seized_at: string };
type Coup = { country_iso: string; status: string };
type Move = {
  type: 'claim' | 'sale';
  countryIso: string;
  countryName: string;
  to: string;
  toUsername: string | null;
  at: string;
};

function ago(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function heldFor(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days < 1 ? 'today' : `${days}d`;
}

const short = (s: string) => (s.startsWith('0x') && s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);

export function GameBoard() {
  const [tab, setTab] = useState<'owners' | 'thrones'>('owners');
  const [top, setTop] = useState(0);
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [thrones, setThrones] = useState<{ rows: Throne[]; contested: Set<string> } | null>(null);
  const [moves, setMoves] = useState<Move[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setLeaders((j?.entries ?? []).slice(0, 6));
      })
      .catch(() => alive && setLeaders([]));
    fetch('/api/thrones')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        const contested = new Set<string>(
          ((j?.coups ?? []) as Coup[]).filter((c) => c.status === 'active').map((c) => c.country_iso),
        );
        setThrones({ rows: ((j?.thrones ?? []) as Throne[]).slice(0, 6), contested });
      })
      .catch(() => alive && setThrones({ rows: [], contested: new Set() }));
    fetch('/api/activity')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setMoves(((j?.events ?? []) as Move[]).slice(0, 5));
      })
      .catch(() => alive && setMoves([]));
    return () => {
      alive = false;
    };
  }, []);

  // The activity list scrolls one row at a time.
  useEffect(() => {
    const n = moves?.length ?? 0;
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setTop((v) => (v + 1) % n), 3600);
    return () => clearInterval(t);
  }, [moves]);

  const emptyRow = (text: string) => (
    <div className="brow">
      <span className="name" style={{ opacity: 0.6 }}>
        {text}
      </span>
    </div>
  );

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
            {leaders === null && emptyRow('Loading…')}
            {leaders?.length === 0 &&
              emptyRow('The world is untouched. The first claim tops this list.')}
            {leaders?.map((row) => (
              <div key={row.rank} className="brow">
                <span className="rank">{row.rank}</span>
                <Flag code={row.country || undefined} size={18} />
                <span className="name">
                  {short(row.username)}
                  <em className="sub">
                    {row.countries === 1
                      ? findCountry(row.country)?.name ?? 'Landowner'
                      : `${row.countries} nations`}
                  </em>
                </span>
                <span className="val">{row.hexes.toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="board-list">
            {thrones === null && emptyRow('Loading…')}
            {thrones?.rows.length === 0 &&
              emptyRow('All 249 thrones stand open. 1,000 hexes and 1M staked $VAVA takes one.')}
            {thrones?.rows.map((t) => (
              <div key={t.country_iso} className="brow">
                <Flag code={t.country_iso.toLowerCase()} size={18} />
                <span className="name">
                  {findCountry(t.country_iso)?.name ?? t.country_iso}
                  <em className="sub">{short(t.holder)}</em>
                </span>
                {thrones.contested.has(t.country_iso) && <span className="pill contested">Contested</span>}
                <span className="val held">{heldFor(t.seized_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What just happened */}
      <div className="board-side">
        <div className="board-side-head">Latest moves</div>
        <div className="board-feed">
          {moves === null && (
            <div className="frow now">
              <span className="ftext" style={{ opacity: 0.6 }}>Loading…</span>
            </div>
          )}
          {moves?.length === 0 && (
            <div className="frow now">
              <span className="ftext" style={{ opacity: 0.7 }}>
                No moves yet - the map is wide open.
              </span>
            </div>
          )}
          {moves?.map((e, i) => (
            <div key={`${e.at}-${i}`} className={`frow ${i === top ? 'now' : ''}`}>
              <Flag code={e.countryIso} size={16} />
              <span className="ftext">
                <b>{e.toUsername ? `@${e.toUsername}` : short(e.to)}</b>{' '}
                {e.type === 'sale' ? 'bought a hex in' : 'claimed a hex in'}{' '}
                <span className="where">{e.countryName}</span>
              </span>
              <span className="fago">{ago(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
