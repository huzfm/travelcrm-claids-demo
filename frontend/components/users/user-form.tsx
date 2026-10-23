'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionPicker } from '@/components/users/permission-picker';
import { AvatarUpload } from '@/components/users/avatar-upload';
import { defaultPermissionsForRole, type FeatureKey } from '@/lib/permissions';
import type { Branch, UserRole } from '@/types';

export interface UserFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  branchId: string;
  permissions: FeatureKey[];
  /** Profile photo URL, or null for initials. */
  avatarUrl: string | null;
}

interface UserFormProps {
  mode: 'create' | 'edit';
  initialValues: UserFormValues;
  branches: Branch[];
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting: boolean;
  /** Keys the signed-in admin may hand out; undefined means "anything". */
  grantableFeatures?: FeatureKey[];
  /** Only an admin may change an existing user's permissions. */
  canEditPermissions: boolean;
  /** Admins implicitly hold everything, so there is nothing to configure. */
  isTargetAdmin?: boolean;
}

export function UserForm({
  mode,
  initialValues,
  branches,
  onSubmit,
  isSubmitting,
  grantableFeatures,
  canEditPermissions,
  isTargetAdmin = false,
}: UserFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<UserFormValues>(initialValues);

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  const showPicker = !isTargetAdmin && values.role !== 'ADMIN';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-brand">
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Profile photo</Label>
            <AvatarUpload
              value={values.avatarUrl}
              onChange={url => set('avatarUrl', url)}
              name={values.name}
              disabled={isSubmitting}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Name</Label>
            <Input
              value={values.name}
              onChange={e => set('name', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={values.email}
              onChange={e => set('email', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>{mode === 'create' ? 'Password' : 'New password (optional)'}</Label>
            <Input
              type="password"
              value={values.password}
              onChange={e => set('password', e.target.value)}
              className="mt-1"
              required={mode === 'create'}
              minLength={6}
              placeholder={
                mode === 'create' ? 'Min 6 characters' : 'Leave blank to keep current password'
              }
            />
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-muted-foreground">
                Min 6 characters. Leave blank to keep the current password.
              </p>
            )}
          </div>

          <div>
            <Label>Phone</Label>
            <PhoneInput value={values.phone} onChange={v => set('phone', v)} className="mt-1" />
          </div>

          <div>
            <Label>Role</Label>
            <Select
              value={values.role}
              onValueChange={v => {
                const role = v as UserRole;
                setValues(prev => ({
                  ...prev,
                  role,
                  // On create, move to the new role's suggested set. On edit,
                  // keep what the admin already chose — changing role should not
                  // silently rewrite a set they curated.
                  permissions:
                    mode === 'create' ? defaultPermissionsForRole(role) : prev.permissions,
                }));
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="RESERVATION_MANAGER">Reservation Manager</SelectItem>
                {mode === 'edit' && <SelectItem value="ADMIN">Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Branch</Label>
            <Select value={values.branchId} onValueChange={v => set('branchId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-brand">
        <CardContent className="pt-6">
          {showPicker ? (
            <div className="space-y-2">
              <PermissionPicker
                value={values.permissions}
                onChange={permissions => set('permissions', permissions)}
                role={values.role}
                grantableFeatures={grantableFeatures}
                disabled={!canEditPermissions}
              />
              {!canEditPermissions && (
                <p className="text-xs text-muted-foreground">
                  Only an admin can change feature access for an existing user.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Admins have access to every feature, so there is nothing to configure here.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/users')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="sm:min-w-40">
          {isSubmitting
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create user'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
