'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Building, KeyRound, Layers, Lock, ShieldCheck, type LucideIcon } from 'lucide-react';

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: KeyRound,
    title: 'Role, then a list of features',
    body: 'Your role is a starting point, not the rule. Except for the Admin, what you can reach is decided by the list of features ticked on your account.',
  },
  {
    icon: Layers,
    title: 'Two levels',
    body: 'A module opens a section of the CRM, like Leads. A sub-permission decides what you can do inside it, like deleting a lead. A sub-permission does nothing without its module.',
  },
  {
    icon: Lock,
    title: 'Nothing by default',
    body: 'A new account reaches nothing until features are granted. If a page is not in your menu, it was never switched on for you.',
  },
  {
    icon: Building,
    title: 'Your branch only',
    body: 'Admins see every branch. Everyone else only ever sees data from their own, and no permission changes that.',
  },
  {
    icon: ShieldCheck,
    title: 'Checked twice',
    body: 'Buttons you cannot use are hidden, and the server checks again when you act. Hiding a button is a courtesy; the server is the actual lock.',
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {POINTS.map((point, i) => {
        const Icon = point.icon;
        return (
          <Card
            key={point.title}
            className={cn(
              'hover:translate-y-0 hover:border-border',
              // The last card sits alone on a 2-up row, so let it run wide.
              i === POINTS.length - 1 && 'md:col-span-2 lg:col-span-1'
            )}
          >
            <CardContent className="p-4 sm:p-5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold tracking-tight text-foreground">
                {point.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{point.body}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
