import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/keepalive - touched daily by Vercel cron (vercel.json) so
 * the free-tier Supabase project never hits the 7-day inactivity pause
 * that silently killed claims once before.
 */
export async function GET() {
  const sb = getServerSupabase();
  const { count, error } = await sb
    .from('countries')
    .select('*', { count: 'exact', head: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, countries: count });
}
