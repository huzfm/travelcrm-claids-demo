import Link from 'next/link';
import type { ReactNode } from 'react';

export const COMPANY_NAME = 'Tripoday';
export const PRODUCT_NAME = 'Tripoday CRM';
export const CONTACT_EMAIL = 'info@claidspheresolutions.com';
export const LAST_UPDATED = '29 September 2026';

/**
 * Shared shell for the public legal pages (privacy policy, data deletion).
 * These must be reachable without logging in - Meta and Google fetch them
 * during app review.
 */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm text-muted-foreground">{PRODUCT_NAME}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>

        <div className="mt-12 flex gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/data-deletion" className="hover:text-foreground">
            Data Deletion
          </Link>
        </div>
      </div>
    </div>
  );
}
