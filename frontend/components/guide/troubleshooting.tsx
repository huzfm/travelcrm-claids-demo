'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/components/providers';
import { hasPermission } from '@/lib/permissions';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

const ISSUES: { symptom: string; cause: string; fix: string }[] = [
  {
    symptom: 'A page is missing from my menu',
    cause: 'You do not hold that area',
    fix: 'Ask an Admin to switch the area on for your account.',
  },
  {
    symptom: 'The page opens but a button is gone',
    cause: 'You hold the area, but not that action inside it',
    fix: 'Ask for the specific action, such as Leads: delete.',
  },
  {
    symptom: '"You do not have permission to use this feature"',
    cause: 'The server refused the action',
    fix: 'The message names what is needed. Pass that name to an Admin.',
  },
  {
    symptom: 'A dashboard panel disappeared',
    cause: 'You hid it, or you were never granted it',
    fix: 'Press Customize on the dashboard. If it is not listed there, an Admin must grant it.',
  },
  {
    symptom: 'My dashboard differs between laptop and phone',
    cause: 'Customize is saved in each browser separately',
    fix: 'Set the panels again on the second device.',
  },
  {
    symptom: 'I cannot see a colleague’s leads',
    cause: 'Branch scoping, or the lead is assigned elsewhere',
    fix: 'Check the branch first. No permission lets you across branches.',
  },
  {
    symptom: 'I was promoted but still see the old screens',
    cause: 'The role changed, the feature list did not',
    fix: 'An Admin must press role defaults on your account and save.',
  },
  {
    symptom: 'We want a second Admin',
    cause: 'Only one Admin is allowed',
    fix: 'Make them a Manager and grant the extra areas they need.',
  },
];

export function Troubleshooting() {
  const { user } = useAuthContext();
  const canManageUsers = hasPermission(user, 'users');

  return (
    <div className="space-y-4">
      <Card className="hover:translate-y-0 hover:border-border">
        <CardContent className="p-0">
          <ul className="divide-y divide-border/70">
            {ISSUES.map(issue => (
              <li
                key={issue.symptom}
                className="grid gap-1 p-4 sm:grid-cols-[1.1fr_0.9fr_1.2fr] sm:gap-4"
              >
                <p className="text-xs font-medium text-foreground sm:text-sm">{issue.symptom}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">{issue.cause}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">{issue.fix}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-warning/30 bg-warning/5 hover:translate-y-0 hover:border-warning/30">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Changing a role does not change what someone can do
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              A role and a feature list are stored separately. Promoting someone from Staff to
              Manager gives them the Manager label and nothing else — their old tick list stays
              exactly as it was. After changing a role, press{' '}
              <span className="font-medium text-foreground">role defaults</span>, save, then adjust
              from there.
            </p>
          </div>
        </CardContent>
      </Card>

      <AdminSteps canManageUsers={canManageUsers} />
    </div>
  );
}

function AdminSteps({ canManageUsers }: { canManageUsers: boolean }) {
  const steps = [
    'Open Staff & Permissions and edit the person.',
    'Tick the areas they need, then the actions inside each one.',
    'Press role defaults first if you want the standard set for their role.',
    'Save. The change applies within 30 seconds — they do not need to sign out.',
  ];

  return (
    <Card className="hover:translate-y-0 hover:border-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Granting access (Admins only)
          </h3>
          {canManageUsers && (
            <Link
              href="/users"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              Staff &amp; Permissions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5">
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary'
                )}
              >
                {i + 1}
              </span>
              <p className="text-xs leading-5 text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>

        <ul className="mt-4 space-y-1.5 border-t border-border/70 pt-3 text-[11px] leading-5 text-muted-foreground">
          <li>
            Ticking an action without its area does nothing — it is dropped on save, so check the
            area is ticked too.
          </li>
          <li>
            Every permission change is written to the Audit Log, with the full before and after.
          </li>
          <li>Nobody can widen their own access. The server rejects the attempt outright.</li>
          <li>
            Deactivating an account is the fastest way to cut someone off completely, whatever they
            hold.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
