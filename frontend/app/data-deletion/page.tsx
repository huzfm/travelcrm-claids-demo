import type { Metadata } from 'next';
import { LegalPage, PRODUCT_NAME, CONTACT_EMAIL } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: `Data Deletion | ${PRODUCT_NAME}`,
  description: `How to delete your data from ${PRODUCT_NAME}.`,
};

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion Instructions">
      <section>
        <p>
          You can remove the data {PRODUCT_NAME} holds from your Facebook, Instagram or Google
          account at any time, in any of the ways below.
        </p>
      </section>

      <section>
        <h2>Option 1: Disconnect inside the CRM</h2>
        <ol>
          <li>Log in to {PRODUCT_NAME}</li>
          <li>
            Open <strong className="text-foreground">Connected Apps</strong>
          </li>
          <li>
            On the Meta Ads card, click <strong className="text-foreground">Disconnect</strong>{' '}
            and confirm
          </li>
        </ol>
        <p className="mt-2">
          This immediately deletes your stored Facebook access tokens and Page tokens, stops your
          Pages sending leads to us, and removes our app from your Facebook account.
        </p>
      </section>

      <section>
        <h2>Option 2: Remove the app from Facebook</h2>
        <ol>
          <li>
            Go to Facebook &rarr; <strong className="text-foreground">Settings &amp; privacy</strong>{' '}
            &rarr; <strong className="text-foreground">Settings</strong>
          </li>
          <li>
            Open <strong className="text-foreground">Business integrations</strong> (or{' '}
            <strong className="text-foreground">Apps and websites</strong>)
          </li>
          <li>
            Find {PRODUCT_NAME} and click <strong className="text-foreground">Remove</strong>
          </li>
        </ol>
        <p className="mt-2">
          Our access ends as soon as you remove the app. Stored tokens stop working and are
          deleted.
        </p>
      </section>

      <section>
        <h2>Option 3: Ask us to delete everything</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the subject{' '}
          <strong className="text-foreground">&quot;Data deletion request&quot;</strong> from the
          email address on your account, or include your Facebook name and Page name. We will
          delete your account, connected-app data and imported leads within 30 days and confirm by
          email once it is done.
        </p>
      </section>
    </LegalPage>
  );
}
