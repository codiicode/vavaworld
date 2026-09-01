'use client';

/**
 * A small diagram per mechanism card. Each one shows the actual behaviour
 * (buy pressure, a floor, a ratchet, a contested throne) rather than being
 * decoration — four text boxes in a row read as a wall of grey without them.
 */

const ACCENT = '#6aa8ff';
const TEAL = '#b8892b';

/** 01 — every purchase routes 15% into the token. */
function BuysToken() {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path
            d={`M${14 + i * 24} 14 L${14 + i * 24} 44`}
            stroke={ACCENT}
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.5"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="12;0"
              dur="1.6s"
              begin={`${i * 0.2}s`}
              repeatCount="indefinite"
            />
          </path>
          <polygon
            points={`${14 + i * 24},6 ${19 + i * 24},9 ${19 + i * 24},15 ${14 + i * 24},18 ${9 + i * 24},15 ${9 + i * 24},9`}
            fill="rgba(27,63,160,0.14)"
            stroke={ACCENT}
            strokeWidth="1"
          />
        </g>
      ))}
      {/* The vault the value lands in. */}
      <rect x="8" y="46" width="104" height="20" rx="6" fill="rgba(184,137,43,0.10)" stroke={TEAL} strokeWidth="1.2" />
      <text x="60" y="60" textAnchor="middle" fontSize="9" fill={TEAL} fontWeight="600" letterSpacing="0.5">
        $VAVA LOCKED
      </text>
    </svg>
  );
}

/** 02 — price can move, but never below the tokens inside. */
function PriceFloor() {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      <path
        d="M6 30 C22 14, 34 44, 50 26 S78 12, 94 32 T114 22"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* The floor itself — the price never crosses it. */}
      <line x1="6" y1="52" x2="114" y2="52" stroke={TEAL} strokeWidth="1.6" strokeDasharray="4 3" />
      <rect x="6" y="52" width="108" height="14" fill="rgba(184,137,43,0.08)" />
      <text x="10" y="64" fontSize="8" fill={TEAL} fontWeight="600" letterSpacing="0.4">
        FLOOR
      </text>
    </svg>
  );
}

/** 03 — a ratchet: claimed land never returns to the pool. */
function SupplyTightens() {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const claimed = i < 3;
        return (
          <rect
            key={i}
            x={8 + i * 22}
            y={claimed ? 20 : 26}
            width="16"
            height={claimed ? 34 : 22}
            rx="3"
            fill={claimed ? 'rgba(27,63,160,0.16)' : 'rgba(14,14,16,0.04)'}
            stroke={claimed ? ACCENT : 'rgba(14,14,16,0.18)'}
            strokeWidth="1"
          />
        );
      })}
      <path d="M8 62 L112 62" stroke="rgba(14,14,16,0.14)" strokeWidth="1" />
      <path d="M96 58 L112 62 L96 66" fill="none" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 04 — one seat, contested by whoever holds the most land. */
function Throne() {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="34" r="21" fill="none" stroke="rgba(14,14,16,0.14)" strokeWidth="1" />
      <circle cx="60" cy="34" r="30" fill="none" stroke="rgba(14,14,16,0.08)" strokeWidth="1" />
      {/* The crown on the seat. */}
      <path
        d="M50 38 L52 27 L57 33 L60 24 L63 33 L68 27 L70 38 Z"
        fill="rgba(27,63,160,0.18)"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="50" y="40" width="20" height="3.5" rx="1.5" fill={ACCENT} opacity="0.85" />
      {/* Challengers circling. */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={60 + 30 * Math.cos((i * 2 * Math.PI) / 3 + 0.5)} cy={34 + 30 * Math.sin((i * 2 * Math.PI) / 3 + 0.5)} r="3" fill="rgba(14,14,16,0.3)">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.4s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <text x="60" y="66" textAnchor="middle" fontSize="8" fill="rgba(14,14,16,0.5)" letterSpacing="0.6">
        1,000,000 $VAVA
      </text>
    </svg>
  );
}

const ART = [BuysToken, PriceFloor, SupplyTightens, Throne];

export function PillarArt({ index }: { index: number }) {
  const Art = ART[index] ?? ART[0];
  return <Art />;
}
