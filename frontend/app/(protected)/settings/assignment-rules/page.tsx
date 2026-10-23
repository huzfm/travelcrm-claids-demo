'use client';

import { useState } from 'react';
import {
  PageWrapper,
  PageHeader,
  LoadingSkeleton,
  EmptyState,
} from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useAssignmentRules,
  useCreateAssignmentRule,
  useUpdateAssignmentRule,
  useDeleteAssignmentRule,
} from '@/hooks/useAssignmentRules';
import { useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuthContext } from '@/components/providers';
import { Plus, Pencil, Trash2, Route, ArrowUpDown, Building2, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/permissions';

const sourceLabels: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  WALKIN: 'Walk-in',
  SOCIAL: 'Social Media',
  BULK_IMPORT: 'Bulk Import',
  META_ADS: 'Meta Ads (Facebook / Instagram)',
  GOOGLE_ADS: 'Google Ads',
};

type AssigneeRow = { userId: string; priority: string };

export default function AssignmentRulesPage() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const { data: rules, isLoading } = useAssignmentRules();
  const { data: users } = useUsers();
  const { data: branches } = useBranches();
  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();
  const deleteRule = useDeleteAssignmentRule();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newSource, setNewSource] = useState('WEBSITE');
  const [newAssignees, setNewAssignees] = useState<AssigneeRow[]>([{ userId: '', priority: '1' }]);
  const [newBranchId, setNewBranchId] = useState(user?.branchId || '');
  const [, setNewIsActive] = useState(true);

  const [editSource, setEditSource] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const usersArray = Array.isArray(users) ? users : [];
  const branchesArray = Array.isArray(branches) ? branches : [];
  const rulesArray = Array.isArray(rules) ? rules : [];

  const resetCreateForm = () => {
    setNewSource('WEBSITE');
    setNewAssignees([{ userId: '', priority: '1' }]);
    setNewBranchId(user?.branchId || '');
    setNewIsActive(true);
  };

  const handleCreate = async () => {
    if (newAssignees.some(a => !a.userId)) {
      toast.error('Please select a user for every row');
      return;
    }
    try {
      await createRule.mutateAsync({
        assignees: newAssignees.map(a => ({
          userId: a.userId,
          priority: parseInt(a.priority) || 1,
        })),
        source: newSource,
        branchId: isAdmin ? newBranchId : undefined,
      });
      toast.success(
        newAssignees.length > 1 ? 'Assignment rules created' : 'Assignment rule created'
      );
      setShowCreateDialog(false);
      resetCreateForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create rule');
    }
  };

  const updateAssignee = (index: number, patch: Partial<AssigneeRow>) =>
    setNewAssignees(rows => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const createUserOptions = usersArray.filter((u: any) => {
    const targetBranch = isAdmin ? newBranchId : user?.branchId;
    return u.isActive && u.branchId === targetBranch;
  });

  const startEdit = (rule: any) => {
    setEditingRule(rule.id);
    setEditSource(rule.source);
    setEditUserId(rule.userId);
    setEditPriority(String(rule.priority));
    setEditIsActive(rule.isActive);
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    try {
      await updateRule.mutateAsync({
        id: editingRule,
        data: {
          source: editSource as any,
          userId: editUserId,
          priority: parseInt(editPriority),
          isActive: editIsActive,
        },
      });
      toast.success('Rule updated');
      setEditingRule(null);
    } catch {
      toast.error('Failed to update rule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success('Rule deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const toggleRuleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateRule.mutateAsync({
        id,
        data: { isActive: !currentActive },
      });
      toast.success(`Rule ${currentActive ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update rule');
    }
  };

  if (isLoading)
    return (
      <PageWrapper>
        <LoadingSkeleton rows={10} />
      </PageWrapper>
    );

  // Group rules by branch
  const rulesByBranch: Record<string, typeof rulesArray> = {};
  rulesArray.forEach(rule => {
    const branchKey = rule.branch?.name || 'Unassigned';
    if (!rulesByBranch[branchKey]) rulesByBranch[branchKey] = [];
    rulesByBranch[branchKey].push(rule);
  });

  const groupBySource = (branchRules: typeof rulesArray) => {
    const groups: Record<string, typeof rulesArray> = {};
    branchRules.forEach(rule => {
      if (!groups[rule.source]) groups[rule.source] = [];
      groups[rule.source].push(rule);
    });
    Object.values(groups).forEach(group => group.sort((a, b) => a.priority - b.priority));
    return Object.entries(groups);
  };

  // Rules sharing the top active priority take turns; the rest are backups
  const describeGroup = (group: typeof rulesArray) => {
    const active = group.filter(r => r.isActive);
    if (active.length === 0) return 'All rules inactive';
    const top = active[0].priority;
    const sharing = active.filter(r => r.priority === top).length;
    return sharing > 1
      ? `Round-robin between ${sharing} users at priority #${top}`
      : `All leads to priority #${top}`;
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Assignment Rules"
        description="Configure auto-assignment rules for new leads"
        action={
          (isAdmin || isManager) && (
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Rule
            </Button>
          )
        }
      />

      {rulesArray.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              title="No assignment rules"
              description="Create rules to automatically assign new leads based on source"
              icon={Route}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(rulesByBranch).map(([branchName, branchRules]) => (
            <Card key={branchName} className="shadow-brand hover:shadow-brand-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {branchName}
                  <Badge variant="secondary">{branchRules.length} rules</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {groupBySource(branchRules).map(([source, group]) => (
                    <div key={source} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {sourceLabels[source] ||
                            (source === 'AD_CAMPAIGN' ? 'Ads (platform unknown)' : source)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {describeGroup(group)}
                        </span>
                      </div>
                      {group.map(rule => (
                        <div
                          key={rule.id}
                          className={cn(
                            'flex items-center justify-between p-4 rounded-lg border transition-colors',
                            !rule.isActive
                              ? 'opacity-50 bg-muted/30 border-border'
                              : 'bg-muted/20 border-border hover:bg-muted/40'
                          )}
                        >
                          {editingRule === rule.id ? (
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                <Select value={editSource} onValueChange={setEditSource}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(sourceLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={editUserId} onValueChange={setEditUserId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {usersArray.map((u: any) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.name} ({roleLabel(u.role)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  min="1"
                                  value={editPriority}
                                  onChange={e => setEditPriority(e.target.value)}
                                  placeholder="Priority"
                                />
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={editIsActive}
                                    onCheckedChange={setEditIsActive}
                                  />
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {editIsActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleUpdate}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingRule(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                  <span className="text-xs sm:text-sm font-medium text-foreground">
                                    #{rule.priority}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                  <span className="text-xs sm:text-sm text-foreground">
                                    {rule.user?.name || 'Unknown'}
                                  </span>
                                </div>
                                <Badge
                                  variant={rule.isActive ? 'default' : 'secondary'}
                                  className="text-[10px] sm:text-xs"
                                >
                                  {rule.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.isActive}
                                  onCheckedChange={() => toggleRuleActive(rule.id, rule.isActive)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(rule)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirmId(rule.id)}
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isAdmin && (
              <div>
                <label className="text-sm font-medium mb-1 block">Branch</label>
                <Select value={newBranchId} onValueChange={setNewBranchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branchesArray.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Lead Source</label>
              <Select value={newSource} onValueChange={setNewSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assign To</label>
              <p className="text-xs text-muted-foreground mb-2">
                Lower number = higher priority. Users with the same priority take turns
                (round-robin); higher numbers are backups used only when nobody above them is
                active.
              </p>
              <div className="space-y-2">
                {newAssignees.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={row.userId}
                      onValueChange={value => updateAssignee(index, { userId: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {createUserOptions
                          .filter(
                            (u: any) =>
                              u.id === row.userId || !newAssignees.some(a => a.userId === u.id)
                          )
                          .map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({roleLabel(u.role)})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={row.priority}
                      onChange={e => updateAssignee(index, { priority: e.target.value })}
                      className="w-20"
                      aria-label="Priority"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={newAssignees.length === 1}
                      onClick={() => setNewAssignees(rows => rows.filter((_, i) => i !== index))}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={newAssignees.length >= createUserOptions.length}
                onClick={() =>
                  setNewAssignees(rows => [
                    ...rows,
                    { userId: '', priority: rows[rows.length - 1]?.priority || '1' },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add user
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRule.isPending}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-muted-foreground">
            Are you sure you want to delete this assignment rule? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
