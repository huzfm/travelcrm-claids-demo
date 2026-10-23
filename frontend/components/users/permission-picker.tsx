'use client';

import { useState } from 'react';
import { Check, ChevronRight, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  FEATURE_GROUPS,
  FEATURE_KEYS,
  PARENT_KEYS,
  childrenOf,
  defaultPermissionsForRole,
  OPT_IN_KEYS,
  ROLE_LABELS,
  sanitizePermissions,
  type Feature,
  type FeatureKey,
} from '@/lib/permissions';
import type { UserRole } from '@/types';

interface PermissionPickerProps {
  value: FeatureKey[];
  onChange: (permissions: FeatureKey[]) => void;
  /** Drives the "role defaults" preset button. */
  role: UserRole;
  /**
   * Keys the signed-in admin may hand out. Omitted for a full admin, who can
   * grant anything; a delegated manager can only pass on what they hold.
   */
  grantableFeatures?: FeatureKey[];
  disabled?: boolean;
}

/** A square checkbox that can also show a partial (some children on) state. */
function CheckBox({
  state,
  className,
}: {
  state: 'on' | 'off' | 'partial' | 'blocked';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        state === 'on' && 'border-primary bg-primary text-primary-foreground',
        state === 'partial' && 'border-primary bg-primary/20 text-primary',
        state === 'off' && 'border-border',
        state === 'blocked' && 'border-border bg-muted',
        className
      )}
    >
      {state === 'on' && <Check className="h-3 w-3" />}
      {state === 'partial' && <Minus className="h-3 w-3" />}
      {state === 'blocked' && <Minus className="h-3 w-3 text-muted-foreground" />}
    </span>
  );
}

export function PermissionPicker({
  value,
  onChange,
  role,
  grantableFeatures,
  disabled = false,
}: PermissionPickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selected = new Set<string>(value);
  const grantable = grantableFeatures ? new Set<string>(grantableFeatures) : null;
  const isGrantable = (key: FeatureKey) => !grantable || grantable.has(key);

  const commit = (next: Set<string>) => {
    // sanitize drops any sub-permission whose module was turned off, which is
    // exactly what the server does on save.
    onChange(sanitizePermissions([...next]));
  };

  /** Toggling a module cascades to its sub-permissions. */
  const toggleModule = (feature: Feature) => {
    if (disabled || !isGrantable(feature.key)) return;
    const next = new Set(selected);

    if (next.has(feature.key)) {
      next.delete(feature.key);
      childrenOf(feature.key).forEach(child => next.delete(child));
    } else {
      next.add(feature.key);
      // Opening a module grants everything in it by default; the admin then
      // narrows it down. Starting empty would make most modules look broken.
      // Agency-wide visibility is the exception — it has to be ticked on purpose.
      childrenOf(feature.key)
        .filter(isGrantable)
        .filter(child => !OPT_IN_KEYS.has(child))
        .forEach(child => next.add(child));
      if (feature.children.length > 0) {
        setExpanded(prev => new Set(prev).add(feature.key));
      }
    }

    commit(next);
  };

  /** Ticking a sub-permission implies its module. */
  const toggleChild = (feature: Feature, childKey: FeatureKey) => {
    if (disabled || !isGrantable(childKey)) return;
    const next = new Set(selected);

    if (next.has(childKey)) next.delete(childKey);
    else {
      next.add(childKey);
      next.add(feature.key);
    }

    commit(next);
  };

  const setAll = (keys: FeatureKey[]) => {
    if (disabled) return;
    commit(new Set(keys.filter(isGrantable)));
  };

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const moduleState = (feature: Feature): 'on' | 'off' | 'partial' => {
    if (!selected.has(feature.key)) return 'off';
    const children = feature.children.filter(c => isGrantable(c.key) && !c.optIn);
    if (children.length === 0) return 'on';
    const on = children.filter(c => selected.has(c.key)).length;
    if (on === children.length) return 'on';
    return 'partial';
  };

  const moduleCount = value.filter(k => !k.includes('.')).length;
  const subCount = value.length - moduleCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Feature access</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tick a module to grant it, then open it to choose exactly what they can do inside.
          </p>
        </div>
        <Badge variant={moduleCount === 0 ? 'secondary' : 'default'} className="shrink-0">
          {moduleCount} module{moduleCount === 1 ? '' : 's'}
          {subCount > 0 && ` · ${subCount} permission${subCount === 1 ? '' : 's'}`}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => setAll(defaultPermissionsForRole(role))}
        >
          {ROLE_LABELS[role]} defaults
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => setAll(FEATURE_KEYS)}
        >
          Select all
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => setAll([])}
        >
          Clear all
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() =>
            setExpanded(prev => (prev.size > 0 ? new Set() : new Set(PARENT_KEYS as string[])))
          }
        >
          {expanded.size > 0 ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>

      {moduleCount === 0 && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          With nothing selected this user can sign in and edit their own profile, but no part of the
          CRM will be available to them.
        </p>
      )}

      <div className="max-h-[52vh] space-y-5 overflow-y-auto rounded-md border border-border p-3">
        {FEATURE_GROUPS.map(({ group, features }) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>

            <div className="grid gap-2 lg:grid-cols-2">
              {features.map(feature => {
                const state = moduleState(feature);
                const allowed = isGrantable(feature.key);
                const isOpen = expanded.has(feature.key);
                const grantableChildren = feature.children.filter(c => isGrantable(c.key));
                const onCount = grantableChildren.filter(c => selected.has(c.key)).length;

                return (
                  <div
                    key={feature.key}
                    className={cn(
                      'rounded-md border transition-colors',
                      state !== 'off' ? 'border-primary/40 bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => toggleModule(feature)}
                        disabled={disabled || !allowed}
                        title={
                          allowed ? feature.description : 'You do not have this feature yourself'
                        }
                        className={cn(
                          'flex min-w-0 flex-1 items-start gap-2 text-left',
                          (disabled || !allowed) && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <CheckBox state={allowed ? state : 'blocked'} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight">
                            {feature.label}
                          </span>
                          <span className="block text-[11px] leading-tight text-muted-foreground">
                            {feature.description}
                          </span>
                        </span>
                      </button>

                      {grantableChildren.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(feature.key)}
                          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                          title="Show sub-permissions"
                        >
                          {onCount}/{grantableChildren.length}
                          <ChevronRight
                            className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
                          />
                        </button>
                      )}
                    </div>

                    {isOpen && grantableChildren.length > 0 && (
                      <div className="space-y-0.5 border-t border-border/60 px-2 pb-2 pt-1.5">
                        {feature.children.map(child => {
                          const childAllowed = isGrantable(child.key);
                          const childOn = selected.has(child.key);

                          return (
                            <button
                              key={child.key}
                              type="button"
                              onClick={() => toggleChild(feature, child.key)}
                              disabled={disabled || !childAllowed}
                              title={
                                childAllowed
                                  ? child.description
                                  : 'You do not have this permission yourself'
                              }
                              className={cn(
                                'flex w-full items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/60',
                                (disabled || !childAllowed) &&
                                  'cursor-not-allowed opacity-50 hover:bg-transparent'
                              )}
                            >
                              <CheckBox
                                state={!childAllowed ? 'blocked' : childOn ? 'on' : 'off'}
                                className="mt-[3px] h-3.5 w-3.5"
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-medium leading-tight">
                                  {child.label}
                                  {child.optIn && (
                                    <span className="ml-1.5 rounded bg-warning/15 px-1 py-px text-[9px] font-semibold uppercase text-warning">
                                      All branches
                                    </span>
                                  )}
                                </span>
                                <span className="block text-[10px] leading-tight text-muted-foreground">
                                  {child.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
