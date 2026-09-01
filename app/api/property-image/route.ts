import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifySignedAction } from '@/lib/server-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_HEXES = 1000;

/** Wallets allowed to moderate (clear anyone's image). Comma-separated. */
function isAdmin(address: string): boolean {
  return (process.env.ADMIN_WALLETS ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .includes(address);
}

/**
 * POST /api/property-image (multipart)
 *   image:     the file (jpeg/png/webp, <= 8MB)
 *   h3s:       JSON array - every hex in the property
 *   address:   owner wallet
 *   message:   `vava:property-image:<count>:ts=<ms>` signed by the wallet
 *   signature: base58 ed25519 signature over `message`
 *
 * ONE image per property: the wallet must own EVERY hex in the list. The
 * image is normalized to <=1024px webp and stored via the gated
 * set_property_image function (INDEXER_API_SECRET pattern - the anon key
 * can never write it directly). Ownership transfers clear the link via
 * DB trigger; replaced images are garbage-collected in the function.
 *
 * DELETE with JSON {h3s, address, message, signature} removes the image.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'expected multipart form' }, { status: 400 });
  }

  const file = form.get('image');
  const address = String(form.get('address') ?? '');
  const message = String(form.get('message') ?? '');
  const signature = String(form.get('signature') ?? '');
  let h3s: string[];
  try {
    h3s = JSON.parse(String(form.get('h3s') ?? '[]'));
  } catch {
    return NextResponse.json({ error: 'invalid h3s' }, { status: 400 });
  }
  if (!Array.isArray(h3s) || h3s.length === 0 || h3s.length > MAX_HEXES) {
    return NextResponse.json({ error: `h3s must contain 1-${MAX_HEXES} hexes` }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'image file missing' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'image too large (max 8MB)' }, { status: 413 });
  }

  const auth = verifySignedAction({
    address,
    message,
    signatureB58: signature,
    expectPrefix: 'vava:property-image:',
  });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  // Normalize: strip metadata, cap at 1024px, webp. Also guarantees the
  // stored blob really is an image - sharp throws on anything else.
  let webp: Buffer;
  try {
    const sharp = (await import('sharp')).default;
    webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'not a valid image' }, { status: 400 });
  }

  const sb = getServerSupabase();
  const { data: id, error } = await sb.rpc('set_property_image', {
    p_secret: API_SECRET,
    p_owner: address,
    p_h3s: h3s,
    p_data: `\\x${webp.toString('hex')}`,
  });
  if (error) {
    const msg = error.message.includes('ownership')
      ? 'you do not own all of these hexes'
      : 'image save failed';
    const status = error.message.includes('ownership') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
  return NextResponse.json({ url: `/api/property-image/file/${id}`, count: h3s.length });
}

export async function DELETE(req: Request) {
  let body: { h3s?: unknown; address?: unknown; message?: unknown; signature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const h3s = Array.isArray(body.h3s) ? (body.h3s as string[]) : [];
  const address = String(body.address ?? '');
  if (h3s.length === 0 || h3s.length > MAX_HEXES) {
    return NextResponse.json({ error: 'invalid h3s' }, { status: 400 });
  }
  const auth = verifySignedAction({
    address,
    message: String(body.message ?? ''),
    signatureB58: String(body.signature ?? ''),
    expectPrefix: 'vava:property-image:',
  });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const sb = getServerSupabase();
  // Moderation path: an allowlisted admin wallet may clear ANY image.
  const { error } = isAdmin(address)
    ? await sb.rpc('clear_property_image_admin', { p_secret: API_SECRET, p_h3s: h3s })
    : await sb.rpc('clear_property_image', {
        p_secret: API_SECRET,
        p_owner: address,
        p_h3s: h3s,
      });
  if (error) {
    const status = error.message.includes('ownership') ? 403 : 500;
    return NextResponse.json({ error: 'remove failed' }, { status });
  }
  return NextResponse.json({ ok: true });
}
