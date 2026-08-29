'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export type DbNotification = {
  id: string;
  recipient: string;
  type: 'bid_received' | 'bid_accepted' | 'bid_declined' | 'bid_cancelled' | 'outbid' | 'hex_sold';
  payload: {
    bid_id?: string;
    h3_id?: string;
    bidder?: string;
    buyer?: string;
    price_sol?: number;
    your_price_sol?: number;
    new_price_sol?: number;
    listing_id?: string;
  };
  created_at: string;
};

// "Read" state is device-local: everything newer than this timestamp
// counts as unread. Avoids requiring a wallet signature just to open
// the bell.
const SEEN_KEY = 'vava-notif-seen';

function getSeenTs(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

const POLL_MS = 30_000;

/**
 * Poll the connected wallet's notifications. Returns the recent feed,
 * the unread count, and markSeen() to clear the badge.
 */
export function useNotifications(address: string | null) {
  const [items, setItems] = useState<DbNotification[]>([]);
  const [seenTs, setSeenTs] = useState(0);

  useEffect(() => {
    setSeenTs(getSeenTs());
  }, []);

  useEffect(() => {
    if (!address) {
      setItems([]);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('recipient', address)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled && data) setItems(data as DbNotification[]);
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address]);

  const unread = items.filter((n) => new Date(n.created_at).getTime() > seenTs).length;

  const markSeen = useCallback(() => {
    const now = Date.now();
    setSeenTs(now);
    try {
      window.localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  }, []);

  return { notifications: items, unread, markSeen };
}
