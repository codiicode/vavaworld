'use client';

import { useEffect, useState } from 'react';
import { CITIES } from './landing-cities';

type Verb = 'taken' | 'listed' | 'passed';
type Row = { id: number; verb: Verb; place: string; price: string; agoSec: number };

const pad = (n: number, w: number) => String(n).padStart(w, '0');

function pickCity() { return CITIES[Math.floor(Math.random() * CITIES.length)]; }

function makeRow(verb: Verb, id: number): Row {
  const a = pickCity();
  let b = a;
  if (verb !== 'taken') while (b === a) b = pickCity();
  const place = verb === 'taken' ? a.name : `${a.name} → ${b.name}`;
  let price: string;
  if (verb === 'taken') price = (Math.random() * 0.5 + 0.04).toFixed(2);
  else if (verb === 'listed') price = (Math.random() * 8 + 0.3).toFixed(2);
  else price = (Math.random() * 12 + 0.5).toFixed(2);
  return { id, verb, place, price, agoSec: 0 };
}

/**
 * Three-column live register: Taken / Listed / Passed on.
 * Mock data on a 2.2s pulse — swap for a websocket subscription later.
 */
export function Register() {
  const [taken, setTaken] = useState<Row[]>([]);
  const [listed, setListed] = useState<Row[]>([]);
  const [passed, setPassed] = useState<Row[]>([]);
  const [counters, setCounters] = useState({ taken: 5, listed: 5, passed: 5 });

  // Seed each column with 5 rows
  useEffect(() => {
    let id = 0;
    const seed = (verb: Verb) =>
      Array.from({ length: 5 }, (_, i) => {
        const r = makeRow(verb, ++id);
        r.agoSec = (i + 1) * 8 + Math.floor(Math.random() * 6);
        return r;
      });
    setTaken(seed('taken'));
    setListed(seed('listed'));
    setPassed(seed('passed'));
  }, []);

  // Tick — drop a new row on top every ~2.2s
  useEffect(() => {
    let nextId = 1000;
    const id = window.setInterval(() => {
      const r1 = Math.random();
      const which: Verb = r1 < 0.55 ? 'taken' : r1 < 0.85 ? 'listed' : 'passed';
      const row = makeRow(which, ++nextId);
      const setter = which === 'taken' ? setTaken : which === 'listed' ? setListed : setPassed;
      setter((prev) => [row, ...prev.slice(0, 4)].map((r, i) => ({
        ...r,
        agoSec: i === 0 ? 0 : i * 6 + Math.floor(Math.random() * 4),
      })));
      setCounters((c) => ({ ...c, [which]: Math.min(999, c[which] + 1) }));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="l-register" id="register">
      <div className="l-reg-inner">
        <div className="l-section-head">
          <div>
            <h2>The <em>register.</em></h2>
            <p className="l-sub">A plain ledger of every cell taken, listed, and passed on — amended hourly.</p>
          </div>
        </div>

        <div className="l-reg-grid">
          <RegCol title="Taken" count={counters.taken} rows={taken} />
          <RegCol title="Listed" count={counters.listed} rows={listed} />
          <RegCol title="Passed on" count={counters.passed} rows={passed} />
        </div>
      </div>
    </section>
  );
}

function RegCol({ title, count, rows }: { title: string; count: number; rows: Row[] }) {
  return (
    <div className="l-reg-col">
      <h3>
        <span>{title}</span>
        <span className="l-ct">{pad(count, 3)}</span>
      </h3>
      <div className="l-reg-list">
        {rows.map((r, i) => (
          <div key={r.id} className={`l-live-row${i === 0 ? ' l-entering' : ''}`}>
            <span className="l-place">{r.place}</span>
            <span className="l-px">◇ {r.price}</span>
            <span className="l-ago">{i === 0 ? 'just now' : `${r.agoSec}s ago`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
