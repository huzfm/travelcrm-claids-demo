'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/permissions';
import { useAuthContext } from '@/components/providers';
import { BedDouble, Building, ShieldCheck, UserCog, Users } from 'lucide-react';
import { MODULE_COUNT, ROLE_BLURBS, ROLE_LABELS, coverageFor, grantedSetForUser } from './coverage';

const ROLE_ICON = {
  ADMIN: ShieldCheck,
  MANAGER: UserCog,
  STAFF: Users,
  RESERVATION_MANAGER: BedDouble,
} as const;

/**
 * The reader's own access, worked out from their live permission list. Most
 * questions people bring to this page are really "what do *I* have", so it
 * answers that before explaining the system.
 */
export function YourAccessCard() {
  const { user } = useAuthContext();

  if (!user) return null;

  const granted = grantedSetForUser(user);
  const open = FEATURES.filter(feature => coverageFor(granted, feature).state !== 'none');
  const isAdmin = user.role === 'ADMIN';
  const RoleIcon = ROLE_ICON[user.role];

  return (
    <Card className="hover:translate-y-0 hover:border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <RoleIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Your access
              </p>
              <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">
                {user.name} &middot; {ROLE_LABELS[user.role]}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {ROLE_BLURBS[user.role]}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user.branch?.name && (
              <Badge variant="outline" className="gap-1">
                <Building className="h-3 w-3" />
                {user.branch.name}
              </Badge>
            )}
            <Badge variant={isAdmin ? 'success' : 'info'}>
              {isAdmin ? 'All areas' : `${open.length} of ${MODULE_COUNT} areas`}
            </Badge>
          </div>
        </div>

        {/* Which areas are open, so they can see the shape of it at a glance. */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FEATURES.map(feature => {
            const coverage = coverageFor(granted, feature);
            return (
              <span
                key={feature.key}
                title={
                  coverage.state === 'none'
                    ? `${feature.label}: no access`
                    : coverage.state === 'partial'
                      ? `${feature.label}: ${coverage.held} of ${coverage.total} actions`
                      : `${feature.label}: full access`
                }
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  coverage.state === 'full' && 'border-transparent bg-success/10 text-success',
                  coverage.state === 'partial' && 'border-transparent bg-warning/15 text-warning',
                  coverage.state === 'none' &&
                    'border-dashed border-border text-muted-foreground/70 line-through'
                )}
              >
                {feature.label}
              </span>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Green is full access, amber means some actions inside are switched off, struck through is
          closed to you. {isAdmin ? 'As the Admin you bypass every check.' : null}
        </p>
      </CardContent>
    </Card>
  );
}
