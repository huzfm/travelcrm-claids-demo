'use client';

import { Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/permissions';
import { useAuthContext } from '@/components/providers';
import {
  GUIDE_GROUPS,
  ROLES,
  ROLE_LABELS,
  type Coverage,
  coverageFor,
  coverageLabel,
  defaultSetForRole,
  grantedSetForUser,
} from './coverage';

/**
 * Every role's starting permissions, side by side, plus what the reader
 * actually holds. Built from the catalog, so a new feature shows up here
 * without anyone remembering to update a list.
 */
export function RoleMatrix() {
  const { user } = useAuthContext();

  const roleSets = ROLES.map(role => ({ role, granted: defaultSetForRole(role) }));
  const yours = grantedSetForUser(user);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground sm:text-sm">
        What each role is given when an account is first created. Every line can be changed per
        person afterwards, so treat this as the starting point rather than a promise. The{' '}
        <span className="font-medium text-foreground">You</span> column is your own access right
        now.
      </p>

      <Card className="overflow-hidden hover:translate-y-0 hover:border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-44">Area</TableHead>
                {ROLES.map(role => (
                  <TableHead key={role} className="whitespace-nowrap text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap text-center text-primary">You</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {GUIDE_GROUPS.map(group => (
                <Fragment key={group.group}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={ROLES.length + 2}
                      className="py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {group.group}
                    </TableCell>
                  </TableRow>

                  {group.features.map(feature => (
                    <TableRow key={feature.key}>
                      <TableCell className="align-top">
                        <p className="text-xs font-medium text-foreground sm:text-sm">
                          {feature.label}
                        </p>
                        <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                          {feature.description}
                        </p>
                      </TableCell>

                      {roleSets.map(({ role, granted }) => (
                        <TableCell key={role} className="text-center align-top">
                          <CoverageChip coverage={coverageFor(granted, feature)} />
                        </TableCell>
                      ))}

                      <TableCell className="text-center align-top">
                        <CoverageChip coverage={coverageFor(yours, feature)} emphasise />
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        {FEATURES.length} areas in total. &ldquo;3 of 9&rdquo; means the area is open but only some
        of the actions inside it are.
      </p>
    </div>
  );
}

function CoverageChip({ coverage, emphasise }: { coverage: Coverage; emphasise?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
        coverage.state === 'full' && 'bg-success/10 text-success',
        coverage.state === 'partial' && 'bg-warning/15 text-warning',
        coverage.state === 'none' && 'text-muted-foreground/60',
        emphasise && coverage.state !== 'none' && 'ring-1 ring-inset ring-border'
      )}
    >
      {coverage.state === 'none' ? '—' : coverageLabel(coverage)}
    </span>
  );
}
