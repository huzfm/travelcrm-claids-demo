'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  PageWrapper,
  PageHeader,
  LoadingSkeleton,
  EmptyState,
} from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers, useUpdateUser } from '@/hooks/useUsers';
import { useAuthContext } from '@/components/providers';
import { Plus, UserCog, Trash2, RotateCcw, Pencil, ShieldCheck, UserX } from 'lucide-react';
import {
  ROLE_LABELS,
  describePermissions,
  roleLabel,
  grantedModuleLabels,
  hasPermission,
} from '@/lib/permissions';
import Link from 'next/link';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import type { User } from '@/types';
import { toast } from 'sonner';

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UsersPage() {
  const { user: currentUser } = useAuthContext();
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const usersArray = Array.isArray(users) ? users : [];
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleDeactivate = async (id: string) => {
    try {
      await updateUser.mutateAsync({ id, data: { isActive: false } });
      toast.success('User deactivated');
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
          'Failed to deactivate user'
      );
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await updateUser.mutateAsync({ id, data: { isActive: true } });
      toast.success('User reactivated');
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
          'Failed to reactivate user'
      );
    }
  };

  // Each action mirrors the sub-permission the API checks, so a button is only
  // shown when the request behind it would actually succeed.
  const canCreate = hasPermission(currentUser, 'users.create');
  const canEdit = hasPermission(currentUser, 'users.edit');
  const canDeactivate = hasPermission(currentUser, 'users.edit');
  const canDelete = hasPermission(currentUser, 'users.delete');
  const canSeeActions = canEdit || canDeactivate || canDelete;
  // Admin accounts cannot be deleted — the API refuses, so no button either.
  const isDeletable = (user: User) => canDelete && user.role !== 'ADMIN';

  return (
    <PageWrapper>
      <PageHeader
        title="Users"
        description="Manage team members and choose which CRM features each of them can use"
        action={
          canCreate && (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/users/new">
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Link>
            </Button>
          )
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {usersArray.length === 0 && (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="No users"
                    description="Create your first team member"
                    icon={UserCog}
                  />
                </CardContent>
              </Card>
            )}
            {usersArray.map(user => (
              <Card key={user.id} className="shadow-brand hover:shadow-brand-lg transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 min-w-0 items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                        <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate text-foreground">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground truncate">{user.phone}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={user.isActive ? 'default' : 'secondary'}
                      className="text-[10px] shrink-0 ml-2"
                    >
                      {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {roleLabel(user.role)}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 shrink-0" />
                      {describePermissions(user)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.branch?.name || '-'}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(user.createdAt), 'PP')}
                    </span>
                  </div>
                  {canSeeActions && user.id !== currentUser?.id && (
                    <div className="flex gap-2 mt-3">
                      {canEdit && (
                        <Button asChild variant="outline" size="sm" className="flex-1 text-xs h-8">
                          <Link href={`/users/${user.id}/edit`}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Link>
                        </Button>
                      )}
                      {!user.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleReactivate(user.id)}
                          disabled={updateUser.isPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex-1 text-xs h-8">
                              <Trash2 className="h-3 w-3 mr-1" /> Deactivate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {user.name}? They will no longer
                                be able to access the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeactivate(user.id)}
                                className="w-full bg-destructive hover:bg-destructive/90"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {isDeletable(user) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8 text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => setUserToDelete(user)}
                        >
                          <UserX className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden shadow-brand">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canSeeActions && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersArray.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState
                        title="No users"
                        description="Create your first team member"
                        icon={UserCog}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {usersArray.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                          <AvatarFallback className="text-xs">
                            {initialsOf(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        title={
                          user.role === 'ADMIN'
                            ? 'Admins have every feature'
                            : grantedModuleLabels(user).join(', ') || 'No features granted'
                        }
                      >
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                        {describePermissions(user)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.branch?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {canEdit ? '••••••••' : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), 'PP')}
                    </TableCell>
                    {canSeeActions && user.id !== currentUser?.id && (
                      <TableCell className="flex gap-2">
                        {canEdit && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/users/${user.id}/edit`}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Link>
                          </Button>
                        )}
                        {!user.isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(user.id)}
                            disabled={updateUser.isPending}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-3 w-3 mr-1" /> Deactivate
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate {user.name}? They will no
                                  longer be able to access the system.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeactivate(user.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {isDeletable(user) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={() => setUserToDelete(user)}
                          >
                            <UserX className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <DeleteUserDialog
        user={userToDelete}
        users={usersArray}
        currentUserId={currentUser?.id}
        onClose={() => setUserToDelete(null)}
      />
    </PageWrapper>
  );
}
