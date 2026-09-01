import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * GET /api/property-image/file/[id] → the stored webp.
 *
 * Every upload mints a NEW id (see set_property_image), so the bytes behind
 * an id never change - immutable caching pushes virtually all traffic to
 * the CDN instead of Postgres.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('get_property_image', {
    p_secret: API_SECRET,
    p_id: id,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // PostgREST serializes bytea as \x-prefixed hex.
  const hex = String(row.data).replace(/^\\x/, '');
  const bytes = Buffer.from(hex, 'hex');
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.content_type ?? 'image/webp',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
}
