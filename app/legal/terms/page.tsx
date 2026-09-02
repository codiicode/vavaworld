import '@/app/hero.css';
import type { Metadata } from 'next';
import { PageShell } from '@/components/landing/PageShell';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms for using VAVAWORLD.',
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of use."
      lede="The rules for using VAVAWORLD. Short, and meant to be read."
    >
      <h2>What a hex is</h2>
      <p>
        Claiming a hex records your wallet as its owner in the VAVAWORLD contract on Robinhood Chain. It
        is a position in a game world. <strong>It does not convey any real-world property
        right</strong>, land title, easement or interest in the physical location it depicts,
        and it grants no rights against whoever owns or occupies that ground.
      </p>

      <h2>Your wallet, your responsibility</h2>
      <p>
        You are responsible for your wallet and its keys. On-chain transactions are final and
        irreversible. We cannot undo a claim, reverse a sale, or recover a lost key.
      </p>

      <h2>No investment promise</h2>
      <p>
        $VAVA and hexes are not offered as investments, and nothing in the product is financial
        advice. Prices can fall. The floor mechanism guarantees only that a hex can be razed
        for the $VAVA it holds, less the 10% burn - not that the token itself holds any value.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not attempt to exploit, drain or disrupt the contracts or the service.</li>
        <li>Do not use the service where it is prohibited by law, or to launder funds.</li>
        <li>Do not impersonate others in usernames or profiles.</li>
        <li>Do not scrape or overload the API beyond ordinary use.</li>
      </ul>
      <p>We may restrict access to accounts that do these things.</p>

      <h2>Availability</h2>
      <p>
        The service is provided as-is. VAVAWORLD runs on <strong>Robinhood Chain</strong>, a
        public network outside our control - we do not guarantee its availability or finality,
        nor uninterrupted availability of the service itself.
      </p>

      <h2>Liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect or consequential
        losses, lost profits, or losses arising from network failures, chain reorganisations,
        wallet compromise, or third-party services the product depends on.
      </p>

      <h2>Changes</h2>
      <p>
        Game mechanics may change as the product develops. Rules already enforced on-chain can
        only change through a program upgrade, which is public.
      </p>
    </PageShell>
  );
}
