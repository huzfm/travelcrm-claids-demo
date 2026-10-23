'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LeadTable } from '@/components/leads/lead-table';
import { LeadForm } from '@/components/leads/lead-form';
import { KanbanBoard, type KanbanColumn } from '@/components/pipeline/kanban-board';
import { useLeads, useCreateLead, useBulkImportLeads, useBulkDeleteLeads } from '@/hooks/useLeads';
import { useUsers } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { useAuthContext } from '@/components/providers';
import {
  Plus,
  Upload,
  Search,
  LayoutGrid,
  List,
  Plane,
  Download,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import type { LeadFilters, LeadStatus, LeadSource, Lead } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

type ViewMode = 'kanban' | 'table';

const KANBAN_COLUMNS = [
  { id: 'FRESH', title: 'Fresh', color: 'bg-stage-fresh', dotColor: 'bg-stage-fresh' },
  { id: 'FOLLOWUP', title: 'Follow Up', color: 'bg-stage-followup', dotColor: 'bg-stage-followup' },
  { id: 'QUOTE_SENT', title: 'Quote Sent', color: 'bg-stage-warm', dotColor: 'bg-stage-warm' },
  { id: 'HOT', title: 'Hot Lead', color: 'bg-stage-hot', dotColor: 'bg-stage-hot' },
  { id: 'WARM', title: 'Warm', color: 'bg-stage-warm', dotColor: 'bg-stage-warm' },
  { id: 'WON', title: 'Booked', color: 'bg-stage-won', dotColor: 'bg-stage-won' },
];

// The list's filter/search/view state is mirrored into the URL and a
// sessionStorage snapshot instead of living only in component state: opening a
// lead unmounts this page, so component state alone would be gone by the time
// the user comes back.
const LIST_STATE_KEY = 'leads:list-state';
const LIST_STATE_KEYS = [
  'status',
  'source',
  'assignedToId',
  'branchId',
  'from',
  'to',
  'page',
  'search',
  'view',
] as const;

type StoredListState = {
  filters: LeadFilters;
  search: string;
  view: ViewMode;
  /** Last scroll offset of the list, so coming back resumes where it ended. */
  scrollY?: number;
};

function filtersFromParams(params: { get(key: string): string | null }): LeadFilters {
  const value = (key: string) => params.get(key) || undefined;
  const page = Number(params.get('page'));
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: 50,
    status: value('status') as LeadFilters['status'],
    source: value('source') as LeadFilters['source'],
    assignedToId: value('assignedToId'),
    branchId: value('branchId'),
    from: value('from'),
    to: value('to'),
  };
}

function readStoredListState(): Partial<StoredListState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LIST_STATE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredListState>) : null;
  } catch {
    return null;
  }
}

/**
 * The element the list actually scrolls in. The app shell is a fixed-height
 * flex box (`h-dvh overflow-hidden`) whose <main> scrolls, so the window
 * itself never does — listening to or restoring `window` scroll was a no-op.
 * Falls back to the document for any layout that scrolls the page instead.
 */
function getScrollContainer(): HTMLElement {
  return document.querySelector('main') ?? document.documentElement;
}

/** Merge a fresh scroll offset into the snapshot without touching the rest of it. */
function persistScrollY(scrollY: number) {
  try {
    const raw = window.sessionStorage.getItem(LIST_STATE_KEY);
    const parsed = (raw ? JSON.parse(raw) : {}) as Partial<StoredListState>;
    window.sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ ...parsed, scrollY }));
  } catch {
    // Storage can be full or blocked — scrolling must never depend on it.
  }
}

// Hydration deliberately lives in the state initializers rather than an
// effect: ProtectedLayout gates its children behind the auth check, so this
// page only ever renders for the first time on the client and reading
// sessionStorage here can never disagree with server-rendered markup.
function readInitialListState(params: {
  has(key: string): boolean;
  get(key: string): string | null;
}): { filters: LeadFilters; search: string; view: ViewMode; scrollY: number | null } {
  const hasUrlState = LIST_STATE_KEYS.some(key => params.has(key));
  const stored = readStoredListState() ?? {};
  // A deep link (/leads?status=HOT) wins over the snapshot for the filters;
  // a bare /leads restores whatever the previous visit had selected. The
  // scroll offset always comes from the snapshot: it is per-tab state, so it
  // can only ever describe this visitor's own last view of the list.
  const restored = hasUrlState ? {} : stored;
  return {
    filters: restored.filters
      ? { page: 1, limit: 50, ...restored.filters }
      : filtersFromParams(params),
    search: typeof restored.search === 'string' ? restored.search : (params.get('search') ?? ''),
    view:
      restored.view === 'kanban' || restored.view === 'table'
        ? restored.view
        : params.get('view') === 'kanban'
          ? 'kanban'
          : 'table',
    scrollY: typeof stored.scrollY === 'number' && stored.scrollY > 0 ? stored.scrollY : null,
  };
}

export default function LeadsPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialListState] = useState(() => readInitialListState(searchParams));
  // Where the reader had scrolled to. Kept in refs — scrolling must never
  // re-render the page — and mirrored into the snapshot so it survives the
  // unmount that opening a lead causes.
  const scrollYRef = useRef(initialListState.scrollY ?? 0);
  const pendingScrollRef = useRef<number | null>(initialListState.scrollY);
  const [filters, setFilters] = useState<LeadFilters>(() => {
    // Hydrated once from the URL (or the sessionStorage snapshot when the URL
    // says nothing) — see readInitialListState above.
    return initialListState.filters;
  });
  const [searchInput, setSearchInput] = useState(initialListState.search);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialListState.view);

  // Keep the latest scroll offset in the snapshot, at most once per frame.
  useEffect(() => {
    const container = getScrollContainer();
    // `scroll` on the document element is dispatched to window.
    const target: HTMLElement | Window =
      container === document.documentElement ? window : container;
    // <main> outlives this page: opening a lead scrolls it to the top (or
    // clamps it to the shorter detail page) before this listener is torn
    // down, and recording that would overwrite the offset with 0. The URL has
    // already moved on by then, so only record while it still says /leads.
    const isOnList = () => window.location.pathname === '/leads';
    let frame = 0;
    const onScroll = () => {
      if (frame || !isOnList()) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!isOnList()) return;
        scrollYRef.current = container.scrollTop;
        persistScrollY(scrollYRef.current);
      });
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Snapshot the current state, so even a push to a bare /leads (e.g. after
  // deleting a lead) can bring the filters back.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        LIST_STATE_KEY,
        JSON.stringify({
          filters,
          search: searchInput,
          view: viewMode,
          scrollY: scrollYRef.current,
        })
      );
    } catch {
      // Storage can be full or blocked — a lost snapshot must never break the page.
    }
  }, [filters, searchInput, viewMode]);

  // Mirror the same state into the URL with replace (not push), so Back still
  // steps out of /leads instead of replaying every filter change. This is what
  // survives the trip into a lead and back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value?: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    set('status', filters.status);
    set('source', filters.source);
    set('assignedToId', filters.assignedToId);
    set('branchId', filters.branchId);
    set('from', filters.from);
    set('to', filters.to);
    set('search', searchInput.trim() || undefined);
    set('page', (filters.page ?? 1) > 1 ? String(filters.page) : undefined);
    set('view', viewMode === 'table' ? undefined : viewMode);

    const query = params.toString();
    const next = query ? `?${query}` : window.location.pathname;
    const current = window.location.pathname + window.location.search;
    if (next === current) return;
    // Native history API — Next keeps useSearchParams in sync with it, and it
    // skips an RSC request for what is purely local state.
    window.history.replaceState(window.history.state, '', next);
  }, [filters, searchInput, viewMode]);

  const debouncedSearch = useDebounce(searchInput, 300);
  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch]
  );

  const { data, isLoading, error } = useLeads(queryFilters);
  const { data: branches } = useBranches();
  const { data: allUsers } = useUsers();
  const createLead = useCreateLead();
  const bulkImport = useBulkImportLeads();
  const bulkDeleteLeads = useBulkDeleteLeads();

  const userBranchId = user?.branchId;
  const userRole = user?.role;
  const isAdmin = userRole === 'ADMIN';
  // Only admins see other people's leads, so only they can filter by assignee.
  const canFilterAssignee = isAdmin;

  const assigneeOptions = useMemo(
    () =>
      (allUsers || [])
        .filter(u => u.isActive && (isAdmin || u.branchId === userBranchId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allUsers, isAdmin, userBranchId]
  );

  // Changing a filter always goes back to page 1 — page 4 of the old result
  // set may not exist in the new one.
  const updateFilters = (patch: Partial<LeadFilters>) =>
    setFilters(prev => ({ ...prev, ...patch, page: 1 }));

  const hasExtraFilters = !!(filters.assignedToId || filters.from || filters.to);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const leadsData = (
    data as {
      data?: {
        leads?: Lead[];
        pagination?: { totalPages?: number; page?: number; total?: number };
      };
    }
  )?.data;
  const leads: Lead[] = useMemo(
    () => (Array.isArray(leadsData?.leads) ? leadsData.leads : []),
    [leadsData]
  );
  const pagination = leadsData?.pagination || {};
  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page || 1;
  const total = pagination.total || leads.length;

  // Back on the list: resume at the offset the reader left from. Runs once,
  // and only once the list has real rows — restoring against skeleton height
  // would clamp the position to the loader.
  useEffect(() => {
    const top = pendingScrollRef.current;
    if (top === null || isLoading) return;
    pendingScrollRef.current = null;
    requestAnimationFrame(() => getScrollContainer().scrollTo(0, top));
  }, [isLoading]);

  // A selection only makes sense against the leads currently on screen —
  // drop it whenever the visible page changes so a stale id can never be
  // sent for a lead the admin isn't looking at anymore. Reset during render
  // (React's documented pattern for this) rather than in an effect, so it
  // can't cause an extra post-commit render.
  const filtersKey = JSON.stringify(queryFilters);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setSelectedIds(new Set());
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      leads.length > 0 && leads.every(l => prev.has(l.id))
        ? new Set()
        : new Set(leads.map(l => l.id))
    );
  }, [leads]);

  const handleBulkDelete = useCallback(async () => {
    try {
      const result = await bulkDeleteLeads.mutateAsync(Array.from(selectedIds));
      toast.success(`${result.deletedCount} lead${result.deletedCount !== 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to delete leads'
      );
    }
  }, [selectedIds, bulkDeleteLeads]);

  useEffect(() => {
    if (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load leads';
      toast.error(message);
    }
  }, [error]);

  const handleCreateLead = useCallback(
    async (formData: Record<string, unknown>) => {
      try {
        await createLead.mutateAsync(formData as Parameters<typeof createLead.mutateAsync>[0]);
        toast.success('Lead created!');
        setIsAddDialogOpen(false);
      } catch (error: unknown) {
        toast.error(
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create lead'
        );
      }
    },
    [createLead]
  );

  const handleBulkImport = useCallback(async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const result = await bulkImport.mutateAsync(formData);
      const { created, duplicates } = result.summary;
      toast.success(
        `Imported ${created} lead${created !== 1 ? 's' : ''}${duplicates > 0 ? ` (${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped)` : ''}!`
      );
      setIsImportDialogOpen(false);
      setSelectedFile(null);
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to import'
      );
    }
  }, [selectedFile, bulkImport]);

  // Build Kanban columns from leads data
  const kanbanColumns: KanbanColumn[] = KANBAN_COLUMNS.map(col => ({
    ...col,
    leads: leads
      .filter(l => {
        // Apply search filter
        if (debouncedSearch) {
          const search = debouncedSearch.toLowerCase();
          if (
            !l.name?.toLowerCase().includes(search) &&
            !l.phone?.includes(search) &&
            !l.email?.toLowerCase().includes(search)
          ) {
            return false;
          }
        }
        // Apply source filter
        if (filters.source && filters.source !== 'ALL' && l.source !== filters.source) return false;
        // Assignee and date range are applied server-side.
        // Apply branch filter
        if (filters.branchId && filters.branchId !== 'ALL' && l.branchId !== filters.branchId)
          return false;
        return l.status === col.id;
      })
      .map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        source: l.source,
        status: l.status,
        assignee: l.assignee?.name || l.assignedToUser?.name,
        assigneeInitials: (l.assignee?.name || l.assignedToUser?.name || '?')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        daysSinceUpdate: l.updatedAt
          ? Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
        score: l.score,
        priority:
          (l.score ?? 0) >= 80
            ? 'high'
            : (l.score ?? 0) >= 50
              ? 'medium'
              : (l.score ?? 0) >= 20
                ? 'low'
                : undefined,
        onClick: () => router.push(`/leads/${l.id}`),
      })),
  }));

  // Total count across visible columns
  const filteredTotal = kanbanColumns.reduce((sum, col) => sum + col.leads.length, 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Leads"
        description="Manage your leads and track their journey"
        action={
          <div className="flex w-full gap-2 sm:w-auto">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="sm:hidden">Import</span>
                  <span className="hidden sm:inline">Bulk Import (Excel)</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bulk Import Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        api
                          .get('/leads/template', { responseType: 'blob' })
                          .then(res => {
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', 'lead-import-template.xlsx');
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            window.URL.revokeObjectURL(url);
                            toast.success('Template downloaded!');
                          })
                          .catch(() => toast.error('Failed to download template'));
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download Template
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={handleBulkImport}
                    disabled={!selectedFile || bulkImport.isPending}
                    className="w-full"
                  >
                    {bulkImport.isPending ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">
                  <Plane className="mr-2 h-4 w-4" /> Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                </DialogHeader>
                <LeadForm
                  branchId={userBranchId}
                  userRole={userRole}
                  branches={branches}
                  staff={allUsers?.filter((u: any) => u.isActive) || []}
                  onSubmit={handleCreateLead}
                  onCancel={() => setIsAddDialogOpen(false)}
                  isLoading={createLead.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Phone: search + view switch on one row, status + source on the next.
          From sm up the wrapper is display:contents so everything joins one row
          and the switch moves to the end. */}
      <div className="flex min-w-0 flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
        <div className="flex min-w-0 gap-2 sm:contents">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          {/* View Toggle */}
          <div className="flex shrink-0 items-center gap-1 bg-muted/60 rounded-lg p-1 border border-border sm:order-last">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'kanban'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex">
          <Select
            value={filters.status || ''}
            onValueChange={v =>
              setFilters(prev => ({
                ...prev,
                status: (v === 'ALL' ? v : (v as LeadStatus)) || undefined,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-10 min-w-0 overflow-hidden sm:w-36 [&>span]:truncate">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {[
                'FRESH',
                'FOLLOWUP',
                'QUOTE_SENT',
                'HOT',
                'WARM',
                'NOT_ANSWERING',
                'WON',
                'NOT_INTERESTED',
                'JUNK',
                'SENT_VOICEMAIL',
                'CALL_DECLINED',
                'CALL_BACK_SCHEDULED',
                'CONNECTED',
                'CLOSED',
              ].map(s => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.source || ''}
            onValueChange={v =>
              setFilters(prev => ({
                ...prev,
                source: (v === 'ALL' ? v : (v as LeadSource)) || undefined,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-10 min-w-0 overflow-hidden sm:w-32 [&>span]:truncate">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sources</SelectItem>
              {[
                ['WEBSITE', 'Website'],
                ['WHATSAPP', 'WhatsApp'],
                ['WALKIN', 'Walk-in'],
                ['SOCIAL', 'Social Media'],
                ['META_ADS', 'Meta Ads'],
                ['GOOGLE_ADS', 'Google Ads'],
                ['BULK_IMPORT', 'Bulk Import'],
              ].map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canFilterAssignee && (
        <div className="flex min-w-0 flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
          <Select
            value={filters.assignedToId || 'ALL'}
            onValueChange={v => updateFilters({ assignedToId: v === 'ALL' ? undefined : v })}
          >
            <SelectTrigger className="h-10 w-full sm:w-48">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Assignees</SelectItem>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {assigneeOptions.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Input wraps the <input> in its own divs, so sizing lives on a
              wrapper here — otherwise the date fields can't shrink on a phone. */}
          {isAdmin && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Created from</span>
                <div className="min-w-0 sm:w-40">
                  <Input
                    type="date"
                    value={filters.from || ''}
                    max={filters.to || undefined}
                    onChange={e => updateFilters({ from: e.target.value || undefined })}
                    className="h-10 w-full min-w-0 appearance-none"
                  />
                </div>
              </label>
              <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <div className="min-w-0 sm:w-40">
                  <Input
                    type="date"
                    value={filters.to || ''}
                    min={filters.from || undefined}
                    onChange={e => updateFilters({ to: e.target.value || undefined })}
                    className="h-10 w-full min-w-0 appearance-none"
                  />
                </div>
              </label>
            </div>
          )}

          {hasExtraFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 self-start sm:self-auto"
              onClick={() =>
                updateFilters({ assignedToId: undefined, from: undefined, to: undefined })
              }
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          viewMode === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.id} className="w-72 sm:w-80 shrink-0">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-t-lg bg-muted border border-b-0 border-border">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', col.dotColor)} />
                      <span className="text-sm font-semibold text-foreground">{col.title}</span>
                      <Skeleton className="h-5 w-6 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-muted/30 border border-t-0 border-border rounded-b-lg p-2 space-y-2.5">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-36 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )
        ) : viewMode === 'kanban' ? (
          <>
            {filteredTotal === 0 && !debouncedSearch && !filters.status && !hasExtraFilters ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-16 text-center animate-fade-in">
                <div className="mb-4 rounded-full bg-primary/10 p-4 border border-border">
                  <Plane className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-1 text-foreground">No leads yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first lead to start tracking your travel pipeline
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add First Lead
                </Button>
              </div>
            ) : filteredTotal === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-16 text-center animate-fade-in">
                <Search className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground">No leads match your filters</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3 pl-1">
                  {filteredTotal} of {total} lead{total !== 1 ? 's' : ''} across pipeline
                </p>
                <KanbanBoard
                  columns={kanbanColumns}
                  showSource={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                />
              </>
            )}
          </>
        ) : (
          <>
            {leads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground animate-fade-in">
                <Plane className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold text-foreground">No leads found</p>
                <p className="text-sm mt-1">
                  {hasExtraFilters
                    ? 'Try adjusting the assignee or date filters'
                    : 'Create your first lead by clicking the Add Lead button'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pl-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {leads.length} of {total} leads
                  </p>
                  {isAdmin && selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
                      <span className="text-xs font-medium">{selectedIds.size} selected</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowBulkDeleteDialog(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                <LeadTable
                  leads={leads}
                  showBranch={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                  showAssigneeRole={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                  showSource={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
                  selectable={isAdmin}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                />
              </>
            )}
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete {selectedIds.size} lead
              {selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLeads.isPending}
            >
              {bulkDeleteLeads.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
