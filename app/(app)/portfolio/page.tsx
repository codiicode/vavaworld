'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import './portfolio-a.css';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useCounters } from '@/lib/use-counters';
import { useHexLocations } from '@/lib/use-hex-locations';
import { quoteOne } from '@/lib/quote';
import type { ClaimedTile } from '@/types/tile';

/* ── Inline SVG icon set (verbatim from handoff, stroke-width 1.8) ───────── */
const PI = {
  map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></svg>
  ),
  portfolio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4h8v2" /><path d="M3 12h18" /></svg>
  ),
  market: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9 5 4h14l2 5" /><path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" /><path d="M9 13h6" /></svg>
  ),
  stake: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M9 12h6M12 9v6" /></svg>
  ),
  activity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg>
  ),
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M10 17h4M9 21h6M12 17v4" /></svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
  ),
  hex: (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M16 3 27.3 9.5v13L16 29 4.7 22.5v-13L16 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" /></svg>
  ),
  coin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 9h4a2 2 0 0 1 0 4H9v4" /></svg>
  ),
  stack: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 16 9 5 9-5" /><path d="m3 12 9 5 9-5" /></svg>
  ),
  logo: (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M16 3 27.3 9.5v13L16 29 4.7 22.5v-13L16 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" /></svg>
  ),
};

const NAV: ReadonlyArray<{ id: string; label: string; href: string; icon: React.ReactNode }> = [
  { id: 'map', label: 'Map', href: '/map', icon: PI.map },
  { id: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: PI.portfolio },
  { id: 'profile', label: 'Profile', href: '/profile', icon: PI.profile },
  { id: 'market', label: 'Marketplace', href: '/marketplace', icon: PI.market },
  { id: 'stake', label: 'Stake', href: '/stake', icon: PI.stake },
  { id: 'activity', label: 'Activity', href: '/activity', icon: PI.activity },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: PI.trophy },
];

function shortAddr(a: string | null): string {
  if (!a) return '—';
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function tierName(t: 1 | 2 | 3): string {
  return t === 1 ? 'City' : t === 2 ? 'Suburb' : 'Remote';
}

function timeAgo(unixSec: number): string {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - unixSec));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ───────── Charts (verbatim from handoff — do not swap for a chart lib) ───────── */
function AreaChart({
  data,
  width = 600,
  height = 160,
  stroke = 'var(--brand)',
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const dx = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * dx;
    const y = height - ((v - min) / range) * (height - 14) - 7;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const fillPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="ac-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,189,248,0.55)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#ac-fill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.18" />
    </svg>
  );
}

function ProjectionChart() {
  const real = [180, 210, 260, 250, 300, 340, 320, 380, 410, 460, 440, 500];
  const proj = [null, null, null, null, null, null, null, 380, 420, 470, 510, 560];
  const w = 600;
  const h = 170;
  const max = 600;
  const min = 100;
  const rng = max - min;
  const dx = w / (real.length - 1);
  const toY = (v: number) => h - ((v - min) / rng) * (h - 14) - 7;
  const dReal = real.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * dx},${toY(v)}`).join(' ');
  const fillReal = `${dReal} L${w},${h} L0,${h} Z`;
  const projPts = proj
    .map((v, i) => (v == null ? null : ([i * dx, toY(v)] as const)))
    .filter((p): p is readonly [number, number] => p != null);
  const dProj = projPts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(56,189,248,0.55)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
      </defs>
      {[100, 200, 300, 400, 500].map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1="0" x2={w} y1={y} y2={y} stroke="rgba(11,31,58,0.10)" strokeWidth="1" strokeDasharray="2 4" />
            <text x="0" y={y - 3} fontSize="10" fill="rgba(11,31,58,0.5)">{v}</text>
          </g>
        );
      })}
      <path d={fillReal} fill="url(#pc-fill)" />
      <path d={dReal} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={dProj} fill="none" stroke="var(--brand-deep)" strokeWidth="2.4" strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── Sidebar ───────── */
function PfSidebar({ username, balance }: { username: string; balance: string }) {
  return (
    <aside className="glass panel sidebar">
      <Link href="/" className="sidebar__brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span className="sidebar__logo">{PI.logo}</span>
        <span className="sidebar__wordmark">VAVAWORLD</span>
      </Link>
      <nav className="sidebar__nav">
        {NAV.map((it) => (
          <Link
            key={it.id}
            className={'nav-item' + (it.id === 'portfolio' ? ' is-active' : '')}
            href={it.href}
          >
            <span className="nav-item__icon">{it.icon}</span>
            <span>{it.label}</span>
            {it.id === 'portfolio' && <span className="nav-item__bar" />}
          </Link>
        ))}
      </nav>
      <div className="sidebar__foot">
        <Link className="nav-item nav-item--quiet" href="/settings">
          <span className="nav-item__icon">{PI.settings}</span>
          <span>Settings</span>
        </Link>
        <Link
          href="/profile"
          className="user-card glass glass--inset"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="user-card__avatar" />
          <div>
            <div className="user-card__name">{username}</div>
            <div className="user-card__bal">{balance}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export default function PortfolioPage() {
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);
  const { tiles } = useUserTiles();
  const counters = useCounters();
  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);

  const derived = useMemo(() => {
    const list: ClaimedTile[] = tiles ?? [];
    let spentLamports = 0n;
    let valueLamports = 0n;
    for (const t of list) {
      spentLamports += t.pricePaid;
      valueLamports += quoteOne(t.tier, counters[t.tier]);
    }
    const spent = Number(spentLamports) / LAMPORTS_PER_SOL;
    const value = Number(valueLamports) / LAMPORTS_PER_SOL;
    const retSol = value - spent;
    const roiPct = spent > 0 ? (retSol / spent) * 100 : 0;

    const now = Date.now() / 1000;
    const monthAgo = now - 30 * 86400;
    const claimedThisMonth = list.filter((t) => t.claimedAt >= monthAgo).length;

    // Holdings rows — sorted newest first, top 4 for the dashboard table.
    const holdings = [...list]
      .sort((a, b) => b.claimedAt - a.claimedAt)
      .slice(0, 4)
      .map((t, i) => {
        const loc = locations.get(t.h3);
        const place =
          loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? 'Locating…';
        const cur = Number(quoteOne(t.tier, counters[t.tier]));
        const paid = Number(t.pricePaid);
        const roi = paid > 0 ? (cur - paid) / paid : 0;
        // "maturity" = how long held, capped at 90d → a real signal.
        const ageDays = (now - t.claimedAt) / 86400;
        const maturity = Math.min(1, Math.max(0.06, ageDays / 90));
        return {
          id: String(i + 1).padStart(2, '0'),
          name: place,
          tier: tierName(t.tier),
          roi: `${roi >= 0 ? '+' : ''}${(roi * 100).toFixed(0)}%`,
          maturity,
        };
      });

    // Regions — group all holdings by country, % of portfolio.
    const byCountry = new Map<string, number>();
    for (const t of list) {
      const loc = locations.get(t.h3);
      const key = loc?.countryName ?? 'Unmapped';
      byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
    }
    const total = list.length || 1;
    const regionColors = ['#0ea5e9', '#22d3ee', '#0369a1', '#7dd3fc'];
    const regions = [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, n], i) => ({
        name,
        count: n,
        pct: Math.round((n / total) * 100),
        color: regionColors[i % regionColors.length],
      }));

    // Activity — most recent 3 claims (real, no indexer needed).
    const activity = [...list]
      .sort((a, b) => b.claimedAt - a.claimedAt)
      .slice(0, 3)
      .map((t) => {
        const loc = locations.get(t.h3);
        const place = loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? 'a hex';
        return {
          tag: 'Claimed',
          note: `${place} · ${(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(3)} SOL`,
          t: timeAgo(t.claimedAt),
        };
      });

    // 12-pt cumulative-spend series for the area chart (falls back to a
    // representative shape if the user has very few claims).
    const sorted = [...list].sort((a, b) => a.claimedAt - b.claimedAt);
    let acc = 0;
    const series = sorted.map((t) => {
      acc += Number(t.pricePaid) / LAMPORTS_PER_SOL;
      return acc;
    });
    const areaData =
      series.length >= 2
        ? series.slice(-12)
        : [10, 14, 12, 18, 22, 19, 26, 30, 28, 36, 33, 42];

    return {
      spent,
      value,
      retSol,
      roiPct,
      count: list.length,
      claimedThisMonth,
      holdings,
      regions,
      activity,
      areaData,
    };
  }, [tiles, counters, locations]);

  const username = profile.username
    ? `@${profile.username}`
    : shortAddr(wallet.address);
  const balanceLabel = balance !== null ? `${balance.toFixed(3)} SOL` : '— SOL';

  return (
    <div className="pf-stage va">
      <div className="sky" />
      <div className="sky-orbs"><span /><span /><span /></div>

      <div className="shell">
        <PfSidebar username={username} balance={balanceLabel} />

        <div className="va-main">
          {/* Welcome */}
          <header className="glass panel welcome">
            <div>
              <div className="welcome__hello">Hi {username} 👋</div>
              <div className="welcome__sub">Welcome back to your VAVAWORLD portfolio.</div>
            </div>
            <Link href="/map" className="welcome__search">
              <span style={{ display: 'grid', placeItems: 'center' }}>{PI.search}</span>
              <span>Search holdings, regions…</span>
            </Link>
          </header>

          {/* KPIs */}
          <div className="kpis">
            <div className="glass panel kpi">
              <div className="kpi__icon">{PI.coin}</div>
              <div className="kpi__big num"><span className="currency">◎</span>{derived.value.toFixed(3)}</div>
              <div className="kpi__label">Total Portfolio Value</div>
              <div className="kpi__delta">
                {derived.roiPct >= 0 ? '+' : ''}{derived.roiPct.toFixed(0)}% vs spent
              </div>
            </div>
            <div className="glass panel kpi">
              <div className="kpi__icon">{PI.hex}</div>
              <div className="kpi__big num">{derived.count}</div>
              <div className="kpi__label">Hexes Owned</div>
              <div className="kpi__delta">+{derived.claimedThisMonth} this month</div>
            </div>
            <div className="glass panel kpi">
              <div className="kpi__icon">{PI.stack}</div>
              <div className="kpi__big num">0</div>
              <div className="kpi__label">Active Stakes</div>
              <div className="kpi__delta" style={{ color: 'var(--text-muted)' }}>Staking soon</div>
            </div>
          </div>

          {/* Holdings */}
          <section className="glass panel holdings">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 className="h2">Holdings</h2>
              <Link href="/profile" className="btn-glass">View all</Link>
            </div>
            <div className="holdings__head">
              <span>#</span><span>Hex</span><span>Maturity</span><span>Performance</span><span style={{ textAlign: 'right' }}>ROI</span><span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {derived.holdings.length === 0 && (
                <div className="holdings__row" style={{ color: 'var(--text-muted)' }}>
                  <span />
                  <div className="holdings__name">
                    <div>
                      <b style={{ fontWeight: 600 }}>No hexes yet</b>
                      <span>Claim your first on the map</span>
                    </div>
                  </div>
                  <span /><span /><span />
                  <Link href="/map" className="chip chip--brand" style={{ justifySelf: 'end' }}>Claim</Link>
                </div>
              )}
              {derived.holdings.map((h) => (
                <div className="holdings__row" key={h.id}>
                  <span className="holdings__idx">{h.id}</span>
                  <div className="holdings__name">
                    <div className="holdings__flag" />
                    <div>
                      <b>{h.name}</b>
                      <span>{h.tier}</span>
                    </div>
                  </div>
                  <div className="bar"><i style={{ width: `${h.maturity * 100}%` }} /></div>
                  <div className="bar"><i style={{ width: `${h.maturity * 90}%`, background: 'linear-gradient(90deg,#22d3ee,#0ea5e9)' }} /></div>
                  <span className="num" style={{ textAlign: 'right', color: 'var(--pos)', fontWeight: 600 }}>{h.roi}</span>
                  <span className="chip chip--brand" style={{ justifySelf: 'end' }}>Live</span>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom */}
          <div className="bottom">
            <div className="glass panel earnings">
              <div className="eyebrow">Total Return</div>
              <div className="earnings__big num">
                <span className="currency">◎</span>{derived.retSol.toFixed(3)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span className="chip chip--brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {PI.arrowUp} {derived.roiPct >= 0 ? '+' : ''}{derived.roiPct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>vs. amount spent</span>
              </div>
              <div style={{ height: 70, marginTop: 12 }}>
                <AreaChart data={derived.areaData} />
              </div>
            </div>

            <div className="glass panel projection">
              <div className="projection__head">
                <h2 className="h2">Projection</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="chip">1M</span>
                  <span className="chip">3M</span>
                  <span className="chip chip--brand">1Y</span>
                </div>
              </div>
              <div className="projection__chart">
                <ProjectionChart />
              </div>
              <div className="projection__legend">
                <span><i style={{ background: 'var(--brand)' }} /> Actual</span>
                <span><i style={{ background: 'var(--brand-deep)', boxShadow: 'inset 0 0 0 1px var(--brand-deep)' }} /> Projected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="rail">
          <div className="glass panel rail__card">
            <h3 className="h3">Top Regions</h3>
            {derived.regions.length === 0 && (
              <div className="region-row">
                <div className="region-row__flag" />
                <div>
                  <div className="region-row__name">No regions yet</div>
                  <div className="region-row__sub">0 hexes</div>
                </div>
                <div className="region-row__pct num">0%</div>
              </div>
            )}
            {derived.regions.map((r) => (
              <div className="region-row" key={r.name}>
                <div className="region-row__flag" style={{ background: `linear-gradient(135deg, ${r.color}, #1d4ed8)` }} />
                <div>
                  <div className="region-row__name">{r.name}</div>
                  <div className="region-row__sub">{r.count} {r.count === 1 ? 'hex' : 'hexes'}</div>
                </div>
                <div className="region-row__pct num">{r.pct}%</div>
              </div>
            ))}
          </div>
          <div className="glass panel rail__card">
            <h3 className="h3">Recent Activity</h3>
            {derived.activity.length === 0 && (
              <div className="activity-row">
                <span className="activity-row__dot" />
                <div className="activity-row__txt">
                  <b>Nothing yet</b> <span>· claim a hex to start</span>
                </div>
                <span className="activity-row__time" />
              </div>
            )}
            {derived.activity.map((a, i) => (
              <div className="activity-row" key={i}>
                <span className="activity-row__dot" />
                <div className="activity-row__txt">
                  <b>{a.tag}</b> <span>· {a.note}</span>
                </div>
                <span className="activity-row__time">{a.t}</span>
              </div>
            ))}
            <Link
              href="/profile"
              className="btn-glass"
              style={{ marginTop: 6, alignSelf: 'stretch', justifyContent: 'center' }}
            >
              View all activity
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
