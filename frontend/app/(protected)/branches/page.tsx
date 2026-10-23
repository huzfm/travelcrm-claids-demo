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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, TIMEZONES } from '@/data/countries-timezones';
import { CURRENCIES } from '@/data/currencies';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from '@/hooks/useBranches';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BranchesPage() {
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<(typeof branchesArray)[0] | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    timezone: '',
    whatsappNumber: '',
    currency: 'INR',
    address: '',
    email: '',
  });
  const branchesArray = Array.isArray(branches) ? branches : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBranch.mutateAsync(formData);
      toast.success('Branch created!');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        country: '',
        timezone: '',
        whatsappNumber: '',
        currency: 'INR',
        address: '',
        email: '',
      });
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create branch'
      );
    }
  };

  const handleEdit = (branch: (typeof branchesArray)[0]) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      country: branch.country || '',
      timezone: branch.timezone || '',
      whatsappNumber: branch.whatsappNumber || '',
      currency: branch.currency || 'INR',
      address: branch.address || '',
      email: branch.email || '',
    });
    setIsDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    try {
      await updateBranch.mutateAsync({ id: editingBranch.id, data: formData });
      toast.success('Branch updated!');
      setIsDialogOpen(false);
      setEditingBranch(null);
      setFormData({
        name: '',
        country: '',
        timezone: '',
        whatsappNumber: '',
        currency: 'INR',
        address: '',
        email: '',
      });
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update branch'
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteBranch.mutateAsync(deleteConfirmId);
      toast.success('Branch deleted!');
      setDeleteConfirmId(null);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to delete branch'
      );
    }
  };

  const openCreateDialog = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      country: '',
      timezone: '',
      whatsappNumber: '',
      currency: 'INR',
      address: '',
      email: '',
    });
    setIsDialogOpen(true);
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Branches"
        description="Manage your organization branches"
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={editingBranch ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <Label>Branch Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                    placeholder="branch@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={value => setFormData({ ...formData, country: value })}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={value => setFormData({ ...formData, timezone: value })}
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.id} value={tz.id}>
                          {tz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={formData.whatsappNumber}
                    onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="mt-1"
                    placeholder="e.g. +971501234567"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                    placeholder="Branch address"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={value => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createBranch.isPending || updateBranch.isPending}
                >
                  {createBranch.isPending || updateBranch.isPending
                    ? 'Saving...'
                    : editingBranch
                      ? 'Update Branch'
                      : 'Create Branch'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {branchesArray.length === 0 && (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="No branches"
                    description="Create your first branch"
                    icon={Building2}
                  />
                </CardContent>
              </Card>
            )}
            {branchesArray.map(branch => (
              <Card
                key={branch.id}
                className="shadow-brand hover:shadow-brand-lg transition-shadow"
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm sm:text-base text-foreground">
                        {branch.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{branch.country || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(branch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteConfirmId(branch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Timezone:</span>{' '}
                      <span className="text-foreground">{branch.timezone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">WhatsApp:</span>{' '}
                      <span className="text-foreground">{branch.whatsappNumber || '-'}</span>
                    </div>
                    {branch.address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Address:</span>{' '}
                        <span className="text-foreground">{branch.address}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Created:</span>{' '}
                      <span className="text-foreground">
                        {format(new Date(branch.createdAt), 'PP')}
                      </span>
                    </div>
                  </div>
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
                  <TableHead>Country</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchesArray.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        title="No branches"
                        description="Create your first branch"
                        icon={Building2}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {branchesArray.map(branch => (
                  <TableRow key={branch.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">{branch.name}</TableCell>
                    <TableCell className="text-muted-foreground">{branch.country || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{branch.address || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.currency || 'INR'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.timezone || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.whatsappNumber || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(branch.createdAt), 'PP')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(branch)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteConfirmId(branch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this branch? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBranch.isPending}>
              {deleteBranch.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
