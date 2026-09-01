import '@/app/hero.css';
import type { Metadata } from 'next';
import { PageShell } from '@/components/landing/PageShell';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What VAVAWORLD collects, what it does not, and who it is shared with.',
};

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy."
      lede="What we collect, what we don't, and who it reaches. Written plainly rather than defensively."
    >
      <h2>What we collect</h2>
      <p>
        <strong>Your wallet address.</strong> Public by nature — it is how the chain knows which
        tiles are yours. Every claim, sale and transfer is already public on Solana.
      </p>
      <p>
        <strong>Profile details you choose to add.</strong> A username, avatar and any social
        account you connect. All optional, all editable, all deletable.
      </p>
      <p>
        <strong>An email address, if you sign in with one.</strong> Sign-in is handled by Privy.
        If you connect an existing wallet instead, we never see an email.
      </p>
      <p>
        <strong>Basic technical logs.</strong> Standard request logs from our hosting provider,
        kept briefly for security and debugging.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>Private keys or seed phrases. These never leave your wallet.</li>
        <li>Payment card details. All payments are on-chain in SOL.</li>
        <li>Precise device location. The map centres on places you search, not on you.</li>
        <li>Cross-site advertising or tracking profiles.</li>
      </ul>

      <h2>Who it is shared with</h2>
      <p>We do not sell personal data. It reaches only the services that run the product:</p>
      <ul>
        <li>
          <strong>Privy</strong> — authentication and embedded wallets.
        </li>
        <li>
          <strong>Supabase</strong> — profiles, listings and indexed tile data.
        </li>
        <li>
          <strong>Mapbox</strong> — map tiles and place search.
        </li>
        <li>
          <strong>Solana RPC providers</strong> — reading and submitting transactions.
        </li>
      </ul>
      <p>
        We may also disclose information where the law requires it, or to investigate abuse of
        the service.
      </p>

      <h2>On-chain data is permanent</h2>
      <p>
        Anything written to Solana — your claims, sales and transfers — is public and cannot be
        edited or erased by us or anyone else. Consider that before linking a wallet to an
        identity you would rather keep separate.
      </p>

      <h2>Your choices</h2>
      <p>
        You can change or clear your username, avatar and connected socials at any time in
        settings, and disconnect your wallet whenever you like. To request deletion of the
        off-chain data tied to your account, contact us — on-chain records will remain, because
        no one can remove them.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only what the app needs to function: a session for sign-in, and local preferences
        such as your map view. No advertising cookies.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially we will say so on the site rather than updating it
        silently.
      </p>
    </PageShell>
  );
}
