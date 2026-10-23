'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Feature } from '@/lib/permissions';
import { useAuthContext } from '@/components/providers';
import { Check, Minus, Search } from 'lucide-react';
import {
  GUIDE_GROUPS,
  ROLES,
  ROLE_LABELS,
  coverageFor,
  defaultSetForRole,
  grantedSetForUser,
} from './coverage';

/**
 * Every grantable feature with its plain-English description, which roles get
 * it by default, and whether the reader holds it. This is the page people land
 * on when they want to know what a specific tick box does.
 */
export function FeatureReference() {
  const { user } = useAuthContext();
  const [query, setQuery] = useState('');

  const roleSets = useMemo(
    () => ROLES.map(role => ({ role, granted: defaultSetForRole(role) })),
    []
  );
  const yours = useMemo(() => grantedSetForUser(user), [user]);

  const needle = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!needle) return GUIDE_GROUPS;

    const matches = (text: string) => text.toLowerCase().includes(needle);

    return GUIDE_GROUPS.map(group => ({
      group: group.group,
      features: group.features.filter(
        feature =>
          matches(feature.label) ||
          matches(feature.description) ||
          matches(feature.key) ||
          feature.children.some(
            child => matches(child.label) || matches(child.description) || matches(child.key)
          )
      ),
    })).filter(group => group.features.length > 0);
  }, [needle]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search features — try 'delete', 'pricing' or 'payments'"
          className="pl-9"
          aria-label="Search features"
        />
      </div>

      {groups.length === 0 ? (
        <Card className="hover:translate-y-0 hover:border-border">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-medium text-foreground">No features match that</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a shorter word, like &ldquo;lead&rdquo; or &ldquo;trip&rdquo;.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(group => (
          <section key={group.group} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.group}
              </h3>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {group.features.map(feature => (
                <FeatureCard
                  key={feature.key}
                  feature={feature}
                  roleSets={roleSets}
                  yours={yours}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function FeatureCard({
  feature,
  roleSets,
  yours,
}: {
  feature: Feature;
  roleSets: { role: (typeof ROLES)[number]; granted: Set<string> }[];
  yours: Set<string>;
}) {
  const mine = coverageFor(yours, feature);

  return (
    <Card className="hover:translate-y-0 hover:border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {feature.label}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
          </div>

          <Badge
            variant={
              mine.state === 'full' ? 'success' : mine.state === 'partial' ? 'warning' : 'outline'
            }
            className="shrink-0"
          >
            {mine.state === 'none'
              ? 'Closed to you'
              : mine.state === 'full'
                ? 'Open'
                : 'Partly open'}
          </Badge>
        </div>

        {/* Who gets the module itself */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            By default
          </span>
          {roleSets.map(({ role, granted }) => (
            <span
              key={role}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                granted.has(feature.key)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground/60 line-through'
              )}
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>

        {feature.children.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
            {feature.children.map(child => {
              const held = yours.has(child.key) && yours.has(feature.key);
              return (
                <li key={child.key} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border',
                      held
                        ? 'border-success bg-success/10 text-success'
                        : 'border-border text-muted-foreground/50'
                    )}
                    aria-hidden
                  >
                    {held ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{child.label}</p>
                    <p className="text-[11px] leading-4 text-muted-foreground">
                      {child.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    {roleSets.map(({ role, granted }) => (
                      <span
                        key={role}
                        title={`${ROLE_LABELS[role]}: ${granted.has(child.key) ? 'granted' : 'not granted'} by default`}
                        className={cn(
                          'grid h-4 w-4 place-items-center rounded text-[9px] font-bold',
                          granted.has(child.key)
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground/50'
                        )}
                      >
                        {ROLE_LABELS[role][0]}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
