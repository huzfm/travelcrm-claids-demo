'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/providers';
import { Sidebar } from './sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { canAccessRoute, firstAccessibleRoute } from '@/lib/permissions';
import { ShieldOff } from 'lucide-react';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const isAllowed = canAccessRoute(user, pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // The backend rejects the underlying requests regardless; this turns what
  // would be a page full of failed fetches into a clear explanation.
  if (!isAllowed) {
    return (
      <Sidebar>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">You don&apos;t have access to this page</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Your administrator hasn&apos;t granted you this feature. Ask them to enable it from
              Staff &amp; Permissions if you need it.
            </p>
          </div>
          <Button onClick={() => router.push(firstAccessibleRoute(user))}>
            Go to my start page
          </Button>
        </div>
      </Sidebar>
    );
  }

  return <Sidebar>{children}</Sidebar>;
}
