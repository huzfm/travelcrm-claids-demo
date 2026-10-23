'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeleteUser } from '@/hooks/useUsers';
import type { User } from '@/types';

const CONFIRM_WORD = 'DELETE';

/**
 * Permanent account deletion. Unlike deactivating, this cannot be undone, so
 * the dialog spells out what happens to their data, asks who takes over their
 * work, and makes the admin type DELETE before the button unlocks.
 */
export function DeleteUserDialog({
  user,
  users,
  currentUserId,
  onClose,
}: {
  /** The user to delete; the dialog is open while this is set. */
  user: User | null;
  /** Everyone listed on the page — candidates to take over the work. */
  users: User[];
  currentUserId?: string;
  onClose: () => void;
}) {
  const deleteUser = useDeleteUser();
  const [heirId, setHeirId] = useState<string>('');
  const [typed, setTyped] = useState('');

  const heirs = users.filter(u => u.isActive && u.id !== user?.id);
  // Defaults to whoever is deleting — the server does the same.
  const selectedHeir = heirId || currentUserId || '';

  const close = () => {
    setHeirId('');
    setTyped('');
    onClose();
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync({ id: user.id, transferTo: selectedHeir });
      toast.success(`${user.name} was deleted`);
      close();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
          'Failed to delete user'
      );
    }
  };

  return (
    <AlertDialog open={!!user} onOpenChange={open => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Permanently delete {user?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This <strong className="text-foreground">cannot be undone</strong>. If you only
                want to stop them signing in, deactivate them instead — that can be reversed.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Their account is removed and they can no longer sign in.</li>
                <li>
                  Their leads, follow-ups, itineraries and payment records move to the person
                  chosen below.
                </li>
                <li>
                  Their WhatsApp is unlinked and all of their WhatsApp chats and messages are
                  deleted.
                </li>
                <li>Lead assignment rules that send leads to them are removed.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Move their work to</Label>
            <Select value={selectedHeir} onValueChange={setHeirId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {heirs.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.id === currentUserId ? ' (you)' : ''}
                    {u.branch?.name ? ` — ${u.branch.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete-user">
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm-delete-user"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={typed !== CONFIRM_WORD || !selectedHeir || deleteUser.isPending}
            className="bg-destructive hover:bg-destructive/90"
            onClick={e => {
              // Stay open until the request finishes, so errors show here.
              e.preventDefault();
              handleDelete();
            }}
          >
            {deleteUser.isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
