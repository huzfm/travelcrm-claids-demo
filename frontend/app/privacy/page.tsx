import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, COMPANY_NAME, PRODUCT_NAME, CONTACT_EMAIL } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: `Privacy Policy | ${PRODUCT_NAME}`,
  description: `How ${PRODUCT_NAME} collects, uses and protects your data.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          {PRODUCT_NAME} (&quot;we&quot;, &quot;us&quot;) is a customer relationship management
          platform for travel agencies, operated by {COMPANY_NAME}. This policy explains what data
          we collect, how we use it, and the choices you have. It applies to the CRM web
          application and to our integrations with Meta (Facebook and Instagram) and Google Ads.
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>
        <p className="mb-2">
          <strong className="text-foreground">Account information.</strong> Name, email address,
          phone number, branch and role of the staff members who use the CRM.
        </p>
        <p className="mb-2">
          <strong className="text-foreground">Customer and lead data.</strong> Details our
          customers enter or import about their own clients: names, phone numbers, email
          addresses, travel preferences, itineraries, follow-ups and messages.
        </p>
        <p className="mb-2">
          <strong className="text-foreground">Data from Meta (Facebook / Instagram).</strong> When
          you choose to connect a Meta account, we receive, with your permission:
        </p>
        <ul>
          <li>Your Facebook user ID and name</li>
          <li>The list of Facebook Pages you manage and access tokens for those Pages</li>
          <li>The list of ad accounts you can access (ID, name, currency, status)</li>
          <li>
            Lead form submissions made on your Pages&apos; lead ads (for example, the name, phone
            number, email and answers a person entered in your form)
          </li>
          <li>Advertising performance figures such as spend, impressions, clicks and lead counts</li>
        </ul>
        <p className="mt-2">
          <strong className="text-foreground">Data from Google Ads.</strong> When you connect a
          Google Ads account, we receive an authorisation token, the customer IDs you can access,
          and campaign performance figures.
        </p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <ul>
          <li>To create leads in your CRM automatically when someone submits your lead form</li>
          <li>To show your advertising spend and results next to the leads they produced</li>
          <li>To assign leads to your staff and schedule follow-ups</li>
          <li>To operate, secure and support the service</li>
        </ul>
        <p className="mt-2">
          We only use data from Meta and Google to provide these features to the business that
          connected the account. We do not use it for our own advertising, and we do not sell,
          rent or trade it.
        </p>
      </section>

      <section>
        <h2>3. How we share information</h2>
        <p>
          Data belongs to the business that entered or connected it and is visible only to that
          business&apos;s authorised users. We share data only with service providers that host and
          run the CRM on our behalf (such as cloud hosting, database and file storage providers),
          under obligations to keep it confidential, or when required by law.
        </p>
      </section>

      <section>
        <h2>4. Storage and security</h2>
        <p>
          Data is stored on secured servers. Access tokens for Meta and Google are kept on our
          servers only and are never exposed to the browser. Access to the CRM is protected by
          login, role-based permissions and per-branch isolation.
        </p>
      </section>

      <section>
        <h2>5. Retention</h2>
        <p>
          We keep data for as long as the business account is active. When you disconnect a Meta
          or Google account, we delete the stored access tokens and stop receiving new data from
          it immediately. Leads already imported remain in your CRM until you delete them or
          request account deletion.
        </p>
      </section>

      <section>
        <h2>6. Your choices and rights</h2>
        <ul>
          <li>
            Disconnect Meta or Google at any time from <em>Connected Apps</em> in the CRM, or by
            removing the app from your Facebook or Google account settings
          </li>
          <li>Ask us for a copy of your data, or to correct or delete it</li>
        </ul>
        <p className="mt-2">
          See <Link href="/data-deletion">Data Deletion</Link> for step-by-step instructions.
        </p>
      </section>

      <section>
        <h2>7. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date above
          shows when it last changed.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
