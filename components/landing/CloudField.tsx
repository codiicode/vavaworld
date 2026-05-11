'use client';

/**
 * Fixed-position drifting cloud layer behind the whole page.
 * Five SVG cloud blobs animated via the .l-drift-* keyframes in landing.css.
 */
export function CloudField() {
  return (
    <>
      {/* Reusable cloud symbols + gradient + blur filter */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <radialGradient id="l-puff" cx="45%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="55%" stopColor="#fbfdff" stopOpacity="0.98" />
            <stop offset="85%" stopColor="#dde9f4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#b9d2e7" stopOpacity="0.55" />
          </radialGradient>
          <filter id="l-cb" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <symbol id="l-cloudA" viewBox="0 0 600 240">
            <g filter="url(#l-cb)" fill="url(#l-puff)">
              <ellipse cx="110" cy="160" rx="95" ry="54" />
              <ellipse cx="205" cy="118" rx="118" ry="72" />
              <ellipse cx="320" cy="96" rx="132" ry="82" />
              <ellipse cx="430" cy="112" rx="110" ry="68" />
              <ellipse cx="515" cy="148" rx="82" ry="50" />
              <ellipse cx="260" cy="170" rx="160" ry="40" />
            </g>
          </symbol>
          <symbol id="l-cloudB" viewBox="0 0 700 200">
            <g filter="url(#l-cb)" fill="url(#l-puff)">
              <ellipse cx="90" cy="130" rx="75" ry="40" />
              <ellipse cx="190" cy="108" rx="110" ry="58" />
              <ellipse cx="310" cy="94" rx="118" ry="66" />
              <ellipse cx="430" cy="100" rx="105" ry="60" />
              <ellipse cx="540" cy="118" rx="95" ry="52" />
              <ellipse cx="640" cy="140" rx="60" ry="36" />
            </g>
          </symbol>
          <symbol id="l-cloudC" viewBox="0 0 400 160">
            <g filter="url(#l-cb)" fill="url(#l-puff)">
              <ellipse cx="100" cy="100" rx="66" ry="34" />
              <ellipse cx="190" cy="82" rx="82" ry="44" />
              <ellipse cx="285" cy="96" rx="72" ry="38" />
              <ellipse cx="345" cy="110" rx="50" ry="28" />
            </g>
          </symbol>
        </defs>
      </svg>

      <div className="l-sky-stage" aria-hidden="true">
        <div className="l-cloud l-drift-1" style={{ top: '6%', left: 0, width: '44vw', height: '20vh' }}>
          <svg className="l-cloud-svg" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet">
            <use href="#l-cloudA" />
          </svg>
        </div>
        <div className="l-cloud l-drift-2" style={{ top: '22%', left: 0, width: '36vw', height: '14vh', opacity: 0.85 }}>
          <svg className="l-cloud-svg" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet">
            <use href="#l-cloudC" />
          </svg>
        </div>
        <div className="l-cloud l-drift-3" style={{ top: '40%', left: 0, width: '54vw', height: '18vh' }}>
          <svg className="l-cloud-svg" viewBox="0 0 700 200" preserveAspectRatio="xMidYMid meet">
            <use href="#l-cloudB" />
          </svg>
        </div>
        <div className="l-cloud l-drift-4" style={{ top: '60%', left: 0, width: '34vw', height: '16vh', opacity: 0.9 }}>
          <svg className="l-cloud-svg" viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet">
            <use href="#l-cloudA" />
          </svg>
        </div>
        <div className="l-cloud l-drift-5" style={{ top: '80%', left: 0, width: '48vw', height: '18vh', opacity: 0.82 }}>
          <svg className="l-cloud-svg" viewBox="0 0 700 200" preserveAspectRatio="xMidYMid meet">
            <use href="#l-cloudB" />
          </svg>
        </div>
      </div>
    </>
  );
}
