'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Gavel,
  Loader2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Flag } from '@/components/flag';
import { UserLink } from '@/components/user-link';
import { useActiveWallet } from '@/lib/active-wallet';
import type { ActiveWallet } from '@/lib/wallet-context';
import { useNotifications, type DbNotification } from '@/lib/use-notifications';
import { useHexLocations } from '@/lib/use-hex-locations';
import { acceptBidOnChain, declineBidOnChain } from '@/lib/bid-chain';

const CARD = 'rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md';

function formatAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function NotificationsPage() {
  const wallet = useActiveWallet();
  const { notifications, markSeen } = useNotifications(wallet.address);

  // Opening the page clears the badge.
  useEffect(() => {
    markSeen();
  }, [markSeen, notifications.length]);

  // Resolve place names for every hex referenced in the feed.
  const hexSet = useMemo(
    () => new Set(notifications.map((n) => n.payload.h3_id).filter((h): h is string => Boolean(h))),
    [notifications],
  );
  const locations = useHexLocations(hexSet);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1.5 text-sm text-foreground/70">
          Offers on your land, accepted bids, and sales.
        </p>
      </div>

      {!wallet.connected ? (
        <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <Wallet size={28} className="text-foreground/40" />
          <p className="text-sm text-foreground/70">Log in to see your notifications.</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <Bell size={28} className="text-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nothing yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-foreground/60">
            When someone makes an offer on your land, accepts your bid, or buys
            one of your hexes, it shows up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              place={
                n.payload.h3_id
                  ? (locations.get(n.payload.h3_id)?.place ??
                    locations.get(n.payload.h3_id)?.countryName ??
                    null)
                  : null
              }
              countryCode={
                (n.payload.h3_id ? locations.get(n.payload.h3_id)?.countryCode : undefined) ??
                undefined
              }
              wallet={wallet}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  n,
  place,
  countryCode,
  wallet,
}: {
  n: DbNotification;
  place: string | null;
  countryCode?: string;
  wallet: ActiveWallet;
}) {
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);
  const [outcome, setOutcome] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const p = n.payload;
  const where = place ?? (p.h3_id ? `${p.h3_id.slice(0, 8)}…` : 'a hex');
  const hexHref = p.h3_id ? `/h/${encodeURIComponent(p.h3_id)}` : '/map';

  const act = async (action: 'accept' | 'decline') => {
    if (!p.bid_id || !p.h3_id || !p.bidder || !wallet.signAndSendTransaction) return;
    setError(null);
    setActing(action);
    try {
      // On-chain settlement: accept splits the escrow (95% to you) and
      // hands over the hex atomically; decline refunds the bidder.
      if (action === 'accept') {
        await acceptBidOnChain({ wallet, h3: p.h3_id, bidId: p.bid_id, bidder: p.bidder });
      } else {
        await declineBidOnChain({ wallet, h3: p.h3_id, bidId: p.bid_id, bidder: p.bidder });
      }
      setOutcome(action === 'accept' ? 'accepted' : 'declined');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(null);
    }
  };

  const icon =
    n.type === 'bid_received' ? (
      <Gavel size={16} />
    ) : n.type === 'hex_sold' ? (
      <CheckCircle2 size={16} />
    ) : n.type === 'outbid' ? (
      <TrendingUp size={16} />
    ) : (
      <Bell size={16} />
    );

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full border border-white/40 bg-white/30 text-foreground/70">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <div className="text-sm text-foreground">
              {n.type === 'bid_received' && (
                <>
                  <UserLink addr={p.bidder ?? ''} /> offered{' '}
                  <b className="tabular-nums">{Number(p.price_sol).toFixed(3)} SOL</b> for your hex in{' '}
                  <HexLink href={hexHref} label={where} countryCode={countryCode} />
                </>
              )}
              {n.type === 'bid_accepted' && (
                <>
                  Your <b className="tabular-nums">{Number(p.price_sol).toFixed(3)} SOL</b> offer on{' '}
                  <HexLink href={hexHref} label={where} countryCode={countryCode} /> was accepted -
                  the hex is yours.
                </>
              )}
              {n.type === 'bid_declined' && (
                <>
                  Your <b className="tabular-nums">{Number(p.price_sol).toFixed(3)} SOL</b> offer on{' '}
                  <HexLink href={hexHref} label={where} countryCode={countryCode} /> was declined.
                </>
              )}
              {n.type === 'bid_cancelled' && (
                <>
                  <UserLink addr={p.bidder ?? ''} /> withdrew their{' '}
                  <b className="tabular-nums">{Number(p.price_sol).toFixed(3)} SOL</b> offer on{' '}
                  <HexLink href={hexHref} label={where} countryCode={countryCode} />
                </>
              )}
              {n.type === 'outbid' && (
                <>
                  You were outbid on <HexLink href={hexHref} label={where} countryCode={countryCode} />{' '}
                  - <b className="tabular-nums">{Number(p.new_price_sol).toFixed(3)} SOL</b> beats your{' '}
                  <span className="tabular-nums">{Number(p.your_price_sol).toFixed(3)} SOL</span>.
                </>
              )}
              {n.type === 'hex_sold' && (
                <>
                  Your hex in <HexLink href={hexHref} label={where} countryCode={countryCode} /> sold to{' '}
                  <UserLink addr={p.buyer ?? ''} /> for{' '}
                  <b className="tabular-nums">{Number(p.price_sol).toFixed(3)} SOL</b>
                </>
              )}
            </div>
            <span className="flex-none text-[11px] text-foreground/50">{formatAgo(n.created_at)}</span>
          </div>

          {/* Inline actions */}
          {n.type === 'bid_received' && !outcome && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                disabled={acting !== null}
                onClick={() => void act('accept')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#7db4f5] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7db4f5] disabled:opacity-50"
              >
                {acting === 'accept' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Accept
              </button>
              <button
                type="button"
                disabled={acting !== null}
                onClick={() => void act('decline')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/40 bg-white/30 px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/40 disabled:opacity-50"
              >
                {acting === 'decline' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Decline
              </button>
            </div>
          )}
          {outcome === 'accepted' && (
            <p className="mt-2 text-xs font-medium text-[#7db4f5] dark:text-white/70">
              Sold - the escrowed SOL landed in your wallet and the hex transferred to the buyer.
            </p>
          )}
          {outcome === 'declined' && (
            <p className="mt-2 text-xs text-foreground/60">Declined - the bidder was refunded.</p>
          )}
          {n.type === 'bid_accepted' && (
            <Link
              href={hexHref}
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-[#7db4f5] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#7db4f5]"
            >
              View your hex
              <ArrowUpRight size={12} />
            </Link>
          )}
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function HexLink({
  href,
  label,
  countryCode,
}: {
  href: string;
  label: string;
  countryCode?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
    >
      {countryCode && <Flag code={countryCode} size={12} />}
      {label}
    </Link>
  );
}
