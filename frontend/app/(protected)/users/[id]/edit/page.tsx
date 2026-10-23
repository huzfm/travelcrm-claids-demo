'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  PageWrapper,
  PageHeader,
  LoadingSkeleton,
  EmptyState,
} from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { UserForm, type UserFormValues } from '@/components/users/user-form';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuthContext } from '@/components/providers';
import { hasPermission, sanitizePermissions, type FeatureKey } from '@/lib/permissions';
import { UserCog } from 'lucide-react';
import type { UserRole } from '@/types';

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuthContext();
  const { data: user, isLoading, isError } = useUser(params?.id);
  const { data: branches } = useBranches();
  const updateUser = useUpdateUser();

  const branchesArray = Array.isArray(branches) ? branches : [];
  const isAdmin = currentUser?.role === 'ADMIN';

  // A delegated (non-admin) manager can only pass on features they hold themselves.
  const grantableFeatures = isAdmin
    ? undefined
    : sanitizePermissions(currentUser?.permissions ?? []);

  const handleSubmit = async (values: UserFormValues) => {
    if (!user) return;

    const payload: {
      name: string;
      email: string;
      phone?: string;
      role: UserRole;
      branchId?: string;
      password?: string;
      permissions?: FeatureKey[];
      avatarUrl?: string | null;
    } = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      role: values.role,
      branchId: values.branchId || undefined,
      // Null is meaningful here — it clears the photo — so it is always sent.
      avatarUrl: values.avatarUrl,
    };

    if (values.password && values.password.length >= 6) {
      payload.password = values.password;
    }

    // Admins hold every feature implicitly, so the server rejects a permission
    // list for them — and only an admin may change one at all.
    if (isAdmin && values.role !== 'ADMIN' && user.role !== 'ADMIN') {
      payload.permissions = values.permissions;
    }

    try {
      await updateUser.mutateAsync({ id: user.id, data: payload });
      toast.success('User updated');
      router.push('/users');
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { error?: string; message?: string } } })
        .response;
      toast.error(response?.data?.error || response?.data?.message || 'Failed to update user');
    }
  };

  if (!hasPermission(currentUser, 'users.edit')) {
    return (
      <PageWrapper>
        <PageHeader title="Edit user" description="You do not have permission to edit staff." />
        <Button variant="outline" onClick={() => router.push('/users')}>
          Back to staff
        </Button>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Edit user" />
        <LoadingSkeleton rows={6} />
      </PageWrapper>
    );
  }

  if (isError || !user) {
    return (
      <PageWrapper>
        <PageHeader title="Edit user" />
        <EmptyState
          title="User not found"
          description="This account may have been deleted."
          icon={UserCog}
        />
        <Button variant="outline" onClick={() => router.push('/users')}>
          Back to staff
        </Button>
      </PageWrapper>
    );
  }

  const initialValues: UserFormValues = {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    password: '',
    role: user.role,
    branchId: user.branchId || user.branch?.id || '',
    permissions: user.role === 'ADMIN' ? [] : sanitizePermissions(user.permissions ?? []),
    avatarUrl: user.avatarUrl ?? null,
  };

  return (
    <PageWrapper>
      <div>
        <Link
          href="/users"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to staff
        </Link>
        <PageHeader
          title={`Edit ${user.name}`}
          description="Change their details, or adjust exactly which parts of the CRM they can use."
        />
      </div>

      <UserForm
        mode="edit"
        initialValues={initialValues}
        branches={branchesArray}
        onSubmit={handleSubmit}
        isSubmitting={updateUser.isPending}
        grantableFeatures={grantableFeatures}
        canEditPermissions={isAdmin}
        isTargetAdmin={user.role === 'ADMIN'}
      />
    </PageWrapper>
  );
}
