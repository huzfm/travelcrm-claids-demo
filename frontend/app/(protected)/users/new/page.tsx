'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { UserForm, type UserFormValues } from '@/components/users/user-form';
import { useCreateUser } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuthContext } from '@/components/providers';
import { defaultPermissionsForRole, hasPermission, sanitizePermissions } from '@/lib/permissions';

export default function NewUserPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthContext();
  const { data: branches } = useBranches();
  const createUser = useCreateUser();

  const branchesArray = Array.isArray(branches) ? branches : [];

  // A delegated (non-admin) manager can only pass on features they hold themselves.
  const grantableFeatures =
    currentUser?.role === 'ADMIN' ? undefined : sanitizePermissions(currentUser?.permissions ?? []);

  const initialValues: UserFormValues = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
    branchId: '',
    permissions: defaultPermissionsForRole('STAFF'),
    avatarUrl: null,
  };

  const handleSubmit = async (values: UserFormValues) => {
    try {
      await createUser.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        role: values.role,
        branchId: values.branchId,
        permissions: values.permissions,
        avatarUrl: values.avatarUrl,
      });
      toast.success('User created');
      router.push('/users');
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { error?: string; message?: string } } })
        .response;
      toast.error(response?.data?.error || response?.data?.message || 'Failed to create user');
    }
  };

  if (!hasPermission(currentUser, 'users.create')) {
    return (
      <PageWrapper>
        <PageHeader title="Add user" description="You do not have permission to create staff." />
        <Button variant="outline" onClick={() => router.push('/users')}>
          Back to staff
        </Button>
      </PageWrapper>
    );
  }

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
          title="Add user"
          description="Set up the account, then choose exactly which parts of the CRM they can use."
        />
      </div>

      <UserForm
        mode="create"
        initialValues={initialValues}
        branches={branchesArray}
        onSubmit={handleSubmit}
        isSubmitting={createUser.isPending}
        grantableFeatures={grantableFeatures}
        canEditPermissions
      />
    </PageWrapper>
  );
}
