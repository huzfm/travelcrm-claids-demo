'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Manual } from '@/components/guide/manual';
import { GUIDE_CATEGORIES } from '@/components/guide/manual-content';
import { BookOpen } from 'lucide-react';

/**
 * The CRM's in-app help center: a searchable, categorized manual covering
 * every module (leads, itineraries, WhatsApp, reporting, admin, ...), plus
 * the permission system. Open to every signed-in user — it is not listed in
 * ROUTE_PERMISSIONS on purpose, because the people most likely to need it are
 * the ones who just found a page missing from their menu.
 */
export default function GuidePage() {
  return (
    <PageWrapper>
      <div className="rounded-xl border border-border bg-linear-to-br from-primary-light via-background to-background p-4 shadow-brand sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Guide
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Search or browse how to use every part of the CRM — leads, itineraries, messaging,
              reporting, and who can access what.
            </p>
          </div>
        </div>
      </div>

      <Manual categories={GUIDE_CATEGORIES} />
    </PageWrapper>
  );
}
