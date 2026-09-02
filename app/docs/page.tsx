import '@/app/hero.css';
import type { Metadata } from 'next';
import { PageShell } from '@/components/landing/PageShell';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How VAVAWORLD works: the grid, claiming, pricing, the token split, and thrones.',
};

const IS_TESTNET = process.env.NEXT_PUBLIC_EVM_CHAIN_ID !== '4663';
const TILES_CONTRACT = process.env.NEXT_PUBLIC_TILES_CONTRACT ?? '';
const EXPLORER = IS_TESTNET
  ? 'explorer.testnet.chain.robinhood.com'
  : 'explorer.mainnet.chain.robinhood.com';

const SECTIONS = [
  { id: 'grid', n: '01', title: 'The grid' },
  { id: 'claiming', n: '02', title: 'Claiming' },
  { id: 'split', n: '03', title: 'Where the money goes' },
  { id: 'razing', n: '04', title: 'Razing' },
  { id: 'market', n: '05', title: 'The marketplace' },
  { id: 'thrones', n: '06', title: 'Thrones' },
  { id: 'staking', n: '07', title: 'Staking' },
  { id: 'network', n: '08', title: 'Network' },
];

function Sec({ id, children }: { id: string; children: React.ReactNode }) {
  const s = SECTIONS.find((x) => x.id === id)!;
  return (
    <section id={id} className="doc-sec">
      <h2>
        <span className="n">{s.n}</span>
        {s.title}
      </h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="How VAVAWORLD works."
      lede="Earth divided into hexagons, claimed on Robinhood Chain. Every rule below is enforced by the on-chain contract, not by policy."
    >
      <div className="doc-layout">
        <nav className="doc-toc" aria-label="Contents">
          <span className="doc-toc-k">Contents</span>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div>
          <Sec id="grid">
            <div className="doc-figures">
              <div className="doc-fig">
                <span className="v">1.66T</span>
                <span className="k">Total hexes</span>
              </div>
              <div className="doc-fig">
                <span className="v">~9 m</span>
                <span className="k">Hex edge</span>
              </div>
              <div className="doc-fig">
                <span className="v">r12</span>
                <span className="k">H3 resolution</span>
              </div>
            </div>
            <p>
              The planet is partitioned using <strong>H3</strong>, Uber&apos;s open hexagonal
              indexing system, at <strong>resolution 12</strong>. That yields exactly
              1,660,954,464,122 cells covering every square metre of Earth - land, ocean,
              ice and desert alike. Each is roughly 9 metres edge to edge, about the footprint
              of a house.
            </p>
            <p>
              Hexagons are used rather than squares because every neighbour sits at the same
              distance from the centre. On a square grid the diagonal neighbours are 41%
              further away than the edge ones, which distorts any calculation about adjacency
              or spread. With hexagons, a block of land is a block of land in every direction.
            </p>
            <p>
              Every cell has a permanent 15-character identifier derived from its position  - 
              something like <code>8cda814548487ff</code>. That index is the hex&apos;s
              identity everywhere: on-chain, in the marketplace, and in the URL when you share
              it. Nothing about a cell depends on who owns it or when it was claimed.
            </p>
            <div className="doc-note">
              Resolution 12 is the claim contract. The program rejects any cell at a different
              resolution, so a hex can never be subdivided or merged after the fact.
            </div>
            <p>
              The map renders the grid at zoom 16 and above. Below that a cell is smaller than a
              pixel, so drawing it would be meaningless - but the cell you click is always the
              cell you claim.
            </p>
          </Sec>

          <Sec id="claiming">
            <p>
              Claiming happens in two halves. Prices come from a per-country curve computed off
              the current claim count; settlement happens on Robinhood Chain. The two are bound
              together by a signed quote, so neither side can drift from the other.
            </p>
            <h3>How a claim executes</h3>
            <p>
              When you confirm a selection, the server issues a typed-data (EIP-712) quote
              naming <strong>the claimer, the payment currency, the exact cells, the price of
              each, and an expiry</strong>, signed with the keeper key. Your wallet submits one
              claim transaction carrying that signature; the contract recovers the signer,
              requires it to be the keeper, and requires the prices in the transaction to match
              the ones that were signed.
            </p>
            <div className="doc-note">
              The program rejects unquoted prices. The number you are shown is the number you
              pay - there is no path by which a claim settles at a different figure.
            </div>
            <h3>Tiers</h3>
            <p>
              Not all ground costs the same. The program carries a table of 102 cities and
              classifies each cell by its distance from the nearest one:{' '}
              <strong>T1</strong> within 50 km, <strong>T2</strong> within 200 km, and{' '}
              <strong>T3</strong> everywhere else. Classification happens on-chain using integer
              bounding boxes rather than floating-point distance, so the client and the contract
              always agree.
            </p>
            <h3>Batch limits</h3>
            <p>
              A single claim transaction settles up to <strong>400 hexes at once</strong> - the
              contract loops the whole quoted basket in one call, roughly 50k gas per hex.
              Larger selections become several sequential rounds, each with its own quote and
              signature, and the app walks through them for you.
            </p>
            <div className="doc-note">
              The program rejects unquoted prices - the number you are shown is the number you
              pay.
            </div>
            <p>
              Prices start near <strong>$0.10</strong> a hex and rise along a bonding curve as
              more ground is claimed in that country. Hexes near major cities sit in higher
              tiers.
            </p>
          </Sec>

          <Sec id="split">
            <p>Every claim splits three ways. There is no fee added on top.</p>
            <div className="doc-split">
              <div className="bar">
                <i style={{ width: '80%', background: '#f2f5fa' }} />
                <i style={{ width: '15%', background: '#7db4f5' }} />
                <i style={{ width: '5%', background: 'rgba(255,255,255,0.35)' }} />
              </div>
            </div>
            <dl>
              <div className="doc-row">
                <dt>Treasury - runs the map, the marketplace, buybacks</dt>
                <dd>80%</dd>
              </div>
              <div className="doc-row">
                <dt>Locked in your hex as $VAVA</dt>
                <dd>15%</dd>
              </div>
              <div className="doc-row">
                <dt>The president of that nation</dt>
                <dd>5%</dd>
              </div>
            </dl>
            <h3>The 15% that matters</h3>
            <p>
              This is the part that makes a hex different from a deed. The moment your claim
              settles, that 15% is used to buy $VAVA on the open market and lock it inside the
              hex you just took. You do not stake anything, sign a second transaction, or opt
              in. It happens inside the one payment.
            </p>
            <p>
              Two consequences follow. Every claim is buy pressure on the token, whether or not
              the claimer cares about it. And every hex carries a balance that belongs to
              whoever holds it - which is where the floor in the next section comes from.
            </p>
            <h3>The president&apos;s 5%</h3>
            <p>
              If a country has no president yet, that share accrues to the treasury and waits.
              It is not lost, and it is not redistributed: whoever eventually takes the throne
              inherits an income stream that has been building since the first claim.
            </p>
          </Sec>

          <Sec id="razing">
            <p>
              Razing is the exit. You burn the hex, and the $VAVA sealed inside it is released
              to your wallet minus a <strong>10% haircut</strong>, which is burned permanently
              and removed from supply.
            </p>
            <p>
              The hex itself returns to nobody. A razed cell does not go back into the
              unclaimed pool for someone else to take - the map only ever shrinks.
            </p>
            <h3>Why this creates a floor</h3>
            <p>
              Because razing is always available to the owner, a hex is worth at least 90% of
              the $VAVA inside it to that owner, at any moment, regardless of what anyone will
              pay. Selling below that number would be strictly worse than razing. That is the
              floor: not a promise anyone is making, just arithmetic the contract enforces.
            </p>
            <div className="doc-note">
              The floor is denominated in $VAVA, not dollars. It guarantees you can recover the
              tokens - not what those tokens will be worth.
            </div>
            <div className="doc-note">
              Because the tokens inside are always redeemable, a hex has a floor: it can never
              rationally sell for less than it holds.
            </div>
          </Sec>

          <Sec id="market">
            <div className="doc-figures">
              <div className="doc-fig">
                <span className="v">95%</span>
                <span className="k">Sellers keep</span>
              </div>
              <div className="doc-fig">
                <span className="v">97%</span>
                <span className="k">Barons keep</span>
              </div>
            </div>
            <p>
              List any hex you own at any price. Barons - holders staking at least 500,000
              $VAVA - pay a 3% fee instead of 5%.
            </p>
            <h3>Listings</h3>
            <p>
              Listing is free and can be cancelled at any time. Your hex stays yours and stays
              on the map while listed; a listing is an offer to sell, not an escrow. The fee is
              taken from the sale proceeds when it actually sells.
            </p>
            <h3>Offers</h3>
            <p>
              You can also bid on hexes nobody has listed. Offers are{' '}
              <strong>escrowed on-chain</strong> - the funds leave your wallet and sit in a
              program-owned account, so an owner considering your offer knows it is real and
              funded.
            </p>
            <p>
              Accepting settles the payment and flips ownership in a single atomic instruction:
              there is no window where one has happened and the other has not. Declining or
              cancelling refunds the escrow automatically. If an owner simply ignores an offer,
              the bidder can withdraw it at any time.
            </p>
          </Sec>

          <Sec id="thrones">
            <p>
              Every one of the <strong>249</strong> nations has a presidency. Own at least{' '}
              <strong>1,000 hexes</strong> in a country and stake 1,000,000 $VAVA to take the
              seat - the same requirement everywhere, from Iceland to the United States.
              You can hold several thrones at once, but each demands its own million:
              a second presidency requires 2,000,000 staked in total, a third 3,000,000.
            </p>
            <p>
              The president earns <strong>5% of every claim</strong> made anywhere in that
              country, for as long as they hold the seat. In a country people are actively
              claiming, that is a continuous income stream from other players&apos; activity
              rather than your own.
            </p>
            <h3>Coups</h3>
            <p>
              A presidency is never permanent. Anyone who comes to hold more ground in that
              country - and meets the same stake requirement - can take the seat from the
              incumbent. There is no cooldown protecting a sitting president and no vote. The
              only defence is owning more land than the challenger.
            </p>
            <p>
              This makes the large countries genuinely contested and the small ones cheap to
              take but modest to hold. A throne in a country nobody claims in earns nothing.
            </p>
          </Sec>

          <Sec id="staking">
            <dl>
              <div className="doc-row">
                <dt>Tourist</dt>
                <dd>No stake</dd>
              </div>
              <div className="doc-row">
                <dt>Citizen - 5% off primary claims</dt>
                <dd>250,000 $VAVA</dd>
              </div>
              <div className="doc-row">
                <dt>Baron - 10% off claims, 3% market fee</dt>
                <dd>500,000 $VAVA</dd>
              </div>
              <div className="doc-row">
                <dt>President-eligible</dt>
                <dd>1,000,000 $VAVA</dd>
              </div>
            </dl>
            <p>
              Staking buys standing rather than yield. There is no interest, no emission and no
              reward for staking on its own - what you get is cheaper land, cheaper trading, and
              eligibility for a throne.
            </p>
            <p>
              Unstaking takes <strong>24 hours</strong>. During that window the tokens are
              neither staked nor spendable, and your tier drops immediately - so you cannot
              claim at a Baron discount and unstake in the same breath.
            </p>
          </Sec>

          <Sec id="network">
            <p>
              VAVAWORLD runs on{' '}
              <strong>Robinhood Chain{IS_TESTNET ? ' testnet' : ''}</strong>, an Ethereum
              layer-2. Everything the app shows you - hexes, owners, prices, balances - is real
              on-chain state read from that network, not a simulation. Gas is paid in ETH;
              claims can be paid in ETH or USDG.
            </p>
            {IS_TESTNET ? (
              <p>
                Testnet funds have no monetary value and can be obtained free from a faucet, so
                you can play through the entire loop without spending anything. The trade-off is
                that a test network can be reset by its operators, which would clear all state.
                That is outside anyone&apos;s control.
              </p>
            ) : null}
            <h3>Verifying it yourself</h3>
            <p>
              {TILES_CONTRACT ? (
                <>
                  The contract is deployed at <code>{TILES_CONTRACT}</code>.{' '}
                </>
              ) : null}
              Every claim, sale and transfer is a public transaction you can inspect at{' '}
              <code>{EXPLORER}</code> without trusting anything this site tells you.
            </p>
          </Sec>
        </div>
      </div>
    </PageShell>
  );
}
