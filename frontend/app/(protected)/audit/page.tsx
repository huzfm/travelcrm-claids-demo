'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  PageWrapper,
  PageHeader,
  LoadingSkeleton,
  EmptyState,
} from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { useAuditLogs, type AuditLogFilters } from '@/hooks/useAuditLogs';
import { Filter, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-success/10 text-success border-success/30',
  UPDATE: 'bg-primary/10 text-primary border-primary/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
  LOGIN: 'bg-accent/10 text-accent border-accent/30',
  LOGOUT: 'bg-muted text-muted-foreground border-border',
  EXPORT: 'bg-warning/10 text-warning border-warning/30',
  IMPORT: 'bg-success/10 text-success border-success/30',
  MERGE: 'bg-primary/10 text-primary border-primary/30',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 50 });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useAuditLogs({ ...filters, page });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ limit: 50 });
    setPage(1);
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Audit Logs"
        description="Track all activity and changes in the CRM system"
      />

      <div className="mb-3 sm:mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/30 border border-border rounded-lg space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Action</Label>
              <Select
                value={filters.action || 'all'}
                onValueChange={v => handleFilterChange('action', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="IMPORT">Import</SelectItem>
                  <SelectItem value="MERGE">Merge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Entity</Label>
              <Select
                value={filters.entity || 'all'}
                onValueChange={v => handleFilterChange('entity', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                  <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="BRANCH">Branch</SelectItem>
                  <SelectItem value="ITINERARY">Itinerary</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Start</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={e => handleFilterChange('startDate', e.target.value)}
                className="text-xs h-9 w-full"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">End</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={e => handleFilterChange('endDate', e.target.value)}
                className="text-xs h-9 w-full"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={10} />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {logs.length === 0 && (
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="No audit logs"
                    description="Activity will appear here"
                    icon={Shield}
                  />
                </CardContent>
              </Card>
            )}
            {logs.map(log => (
              <Card key={log.id} className="shadow-brand hover:shadow-brand-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', ACTION_COLORS[log.action] || '')}
                    >
                      {log.action}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {log.ipAddress || '-'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {log.user?.name || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{log.user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {log.entity}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground truncate flex-1">
                      {log.description || '-'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block border border-border rounded-lg overflow-hidden shadow-brand">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        title="No audit logs"
                        description="Activity will appear here as users interact with the CRM"
                        icon={Shield}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {logs.map(log => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">
                          {log.user?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ACTION_COLORS[log.action] || ''}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.entity}</Badge>
                    </TableCell>
                    <TableCell
                      className="max-w-xs truncate text-sm text-muted-foreground"
                      title={log.description || ''}
                    >
                      {log.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {(page - 1) * (filters.limit || 50) + 1}-
            {Math.min(page * (filters.limit || 50), pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
