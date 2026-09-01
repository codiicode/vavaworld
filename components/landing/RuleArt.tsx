'use client';

import { useLandingStats } from '@/lib/use-landing-stats';

/**
 * One product screen per rule. Earlier versions drew the rules as
 * illustration - falling seeds, a crown - which reads as clip-art at
 * any size. What reads as high quality is the interface the rule
 * actually produces: a deed, a price ladder, a supply meter, a
 * contested throne, in the same chrome as the app.
 */

/** 01 - every hex is loaded: the deed, showing what is sealed inside. */
export function ArtLoaded() {
  return (
    <div className="ui-card">
      <div className="ui-head">
        Your deed
        <span className="tag">On-chain</span>
      </div>
      <div className="ui-hero">
        <span className="ui-hero-k">$VAVA sealed inside</span>
        <span className="ui-hero-v">1,284.60</span>
        <span className="ui-hero-note">Yours the moment you claim</span>
      </div>
      <div className="ui-rows">
        <div className="ui-row">
          <span className="k">You paid</span>
          <span className="v">0.0021 SOL</span>
        </div>
        <div className="ui-row">
          <span className="k">Redeem</span>
          <span className="v">Any time</span>
        </div>
      </div>
    </div>
  );
}

/** 02 - your land has a floor: the price ladder resting on it. */
export function ArtFloor() {
  const bars = [58, 71, 49, 82, 63, 90, 55, 74];
  return (
    <div className="ui-card">
      <div className="ui-head">
        Market · your hex
        <span className="tag">30d</span>
      </div>
      <div className="ui-ladder">
        <div className="ui-bars">
          {bars.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%`, animationDelay: `${i * 0.28}s` }}
            />
          ))}
        </div>
        <div className="ui-floorline">
          <em>FLOOR · 1,284 $VAVA</em>
        </div>
      </div>
      <div className="ui-rows">
        <div className="ui-row hl">
          <span className="k">It can never sell for less</span>
          <span className="v">than it holds</span>
        </div>
      </div>
    </div>
  );
}

/** 03 - the map only shrinks: supply draining, never refilling. */
export function ArtShrink() {
  const stats = useLandingStats();
  return (
    <div className="ui-card">
      <div className="ui-head">
        Ground remaining
        <span className="tag">Supply</span>
      </div>
      <div className="ui-hero">
        <span className="ui-hero-k">Hexes still unclaimed</span>
        <span className="ui-hero-v">1.66T</span>
        <span className="ui-hero-note">Every claim makes the rest rarer</span>
      </div>
      <div className="ui-meter">
        <i />
      </div>
      <div className="ui-rows">
        <div className="ui-row">
          <span className="k">Claimed today</span>
          <span className="v">
            {stats ? stats.claimedToday.toLocaleString('en-US') : ' - '}
          </span>
        </div>
        <div className="ui-row hl">
          <span className="k">Ever returned to the pool</span>
          <span className="v">0</span>
        </div>
      </div>
    </div>
  );
}

/** 04 - take a throne: the seat, and who is coming for it. */
export function ArtThrone() {
  return (
    <div className="ui-card">
      <div className="ui-head">
        Presidency · Brazil
        <span className="tag">Contested</span>
      </div>
      <div className="ui-vs">
        <div>
          <div className="who crown">@shibuyaSam</div>
          <div className="amt">14,203</div>
          <div className="sub">Holds · hexes</div>
        </div>
        <div>
          <div className="who">@nordicwhale</div>
          <div className="amt">11,840</div>
          <div className="sub">Challenger</div>
        </div>
      </div>
      <div className="ui-rows">
        <div className="ui-row hl">
          <span className="k">The seat earns</span>
          <span className="v">5% of every claim</span>
        </div>
        <div className="ui-row">
          <span className="k">Stake to take it</span>
          <span className="v">1,000,000 $VAVA</span>
        </div>
      </div>
    </div>
  );
}
