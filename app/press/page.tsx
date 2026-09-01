import '@/app/hero.css';
import type { Metadata } from 'next';
import { PageShell } from '@/components/landing/PageShell';

export const metadata: Metadata = {
  title: 'Press kit',
  description: 'Logos, facts, boilerplate and screenshots for writing about VAVAWORLD.',
};

const ASSETS = [
  { name: 'Globe mark - white', file: '/logo-globe-white.png', note: 'For dark backgrounds' },
  { name: 'Globe mark - colour', file: '/logo-globe-color.png', note: 'For light backgrounds' },
];

export default function PressPage() {
  return (
    <PageShell
      eyebrow="Press kit"
      title="Assets and facts."
      lede="Everything you need to write about VAVAWORLD. Use the marks as they are - please don't recolour, stretch or add effects to them."
    >
      <h2>The short version</h2>
      <p>
        VAVAWORLD divides Earth into 1.66 trillion hexagons and lets anyone claim one on Solana.
        Every claim buys $VAVA and seals it inside the land itself, so a hex always holds
        redeemable value. Each of the 249 territories has a presidency that earns a cut of every
        claim made on its soil.
      </p>

      <h2>Boilerplate</h2>
      <p>
        <em>
          VAVAWORLD is a land-claiming game built on Solana. The planet is partitioned into
          1.66 trillion hexagonal hexes roughly the size of a house; players claim them with
          crypto, and 15% of every claim automatically buys $VAVA and locks it inside the hex.
          Hexes can be held, traded on an open marketplace, or razed to recover the tokens
          within.
        </em>
      </p>

      <h2>Fast facts</h2>
      <dl>
        <div className="doc-row">
          <dt>Chain</dt>
          <dd>Solana (devnet)</dd>
        </div>
        <div className="doc-row">
          <dt>Grid</dt>
          <dd>H3 resolution 12</dd>
        </div>
        <div className="doc-row">
          <dt>Total hexes</dt>
          <dd>1,660,954,464,122</dd>
        </div>
        <div className="doc-row">
          <dt>Hex size</dt>
          <dd>~9 m edge</dd>
        </div>
        <div className="doc-row">
          <dt>Territories</dt>
          <dd>249</dd>
        </div>
        <div className="doc-row">
          <dt>Starting price</dt>
          <dd>~$0.10 per hex</dd>
        </div>
        <div className="doc-row">
          <dt>Locked into each hex</dt>
          <dd>15% of the claim</dd>
        </div>
        <div className="doc-row">
          <dt>Marketplace fee</dt>
          <dd>5% (3% for barons)</dd>
        </div>
        <div className="doc-row">
          <dt>Token</dt>
          <dd>$VAVA</dd>
        </div>
      </dl>

      <h2>Logos</h2>
      <p>Right-click to save. PNG with transparency, cut tight to the mark.</p>
      <div className="press-grid">
        {ASSETS.map((a) => (
          <a key={a.file} href={a.file} download className="press-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.file} alt={a.name} />
            <span className="press-name">{a.name}</span>
            <span className="press-note">{a.note}</span>
          </a>
        ))}
      </div>

      <h2>Using the name</h2>
      <ul>
        <li>
          The product is <strong>VAVAWORLD</strong>, one word, all caps in display use.
        </li>
        <li>
          The token is always written <strong>$VAVA</strong> - never &ldquo;VAVA token&rdquo;.
        </li>
        <li>A claimed hexagon is a <strong>hex</strong> or a <strong>hex</strong>, not a plot or an NFT.</li>
      </ul>

      <h2>Colours</h2>
      <dl>
        <div className="doc-row">
          <dt>Ground</dt>
          <dd>#04060B</dd>
        </div>
        <div className="doc-row">
          <dt>Accent</dt>
          <dd>#7DB4F5</dd>
        </div>
        <div className="doc-row">
          <dt>Type</dt>
          <dd>Geist</dd>
        </div>
      </dl>

      <h2>Contact</h2>
      <p>
        For interviews, review access or anything not covered here, get in touch through the
        site.
      </p>
    </PageShell>
  );
}
