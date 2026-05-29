'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` for a brief beat after first mount, then `false`. Used to show
 * a skeleton on ranking pages so data reads as freshly fetched. One-shot per
 * mount - it does not re-trigger on sort/filter changes.
 */
export function useFirstMountLoading(ms = 450): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
