'use client';

import { useState, useEffect } from 'react';
import { PageWrapper, PageHeader, LoadingSkeleton } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/components/providers';
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Phone,
  Clock,
  CheckCircle,
  Target,
  Trophy,
  Building2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Calendar,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/permissions';

interface Branch {
  id: string;
  name: string;
}
interface User {
  id: string;
  name: string;
  role: string;
  branch?: { name: string };
}
interface Lead {
  id: string;
  name: string;
  assignedTo: string;
  status: string;
}
interface FollowUp {
  id: string;
  assignedTo: string;
  status: string;
}

export default function PerformancePage() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [filterKey, setFilterKey] = useState<number>(1);

  // Custom date filter
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const branchesRes = await api.get('/branches');
      const branchesData = Array.isArray(branchesRes.data)
        ? branchesRes.data
        : branchesRes.data?.data?.branches || branchesRes.data?.data || [];
      setBranches(Array.isArray(branchesData) ? branchesData : []);

      const usersParams = new URLSearchParams();
      if (isAdmin && selectedBranchId) {
        usersParams.append('branchId', selectedBranchId);
      }

      const usersRes = await api.get(`/users?${usersParams.toString()}`);
      let usersData: User[] = [];
      if (Array.isArray(usersRes.data)) {
        usersData = usersRes.data;
      } else if (usersRes.data?.data) {
        usersData = Array.isArray(usersRes.data.data)
          ? usersRes.data.data
          : usersRes.data.data.users || [];
      }
      const filteredUsers = usersData.filter(u => u.role === 'STAFF' || u.role === 'MANAGER');
      setUsers(filteredUsers);

      const leadsParams = new URLSearchParams();
      if (isAdmin && selectedBranchId) {
        leadsParams.append('branchId', selectedBranchId);
      }
      if (selectedUserId && selectedUserId !== 'all') {
        leadsParams.append('assignedToId', selectedUserId);
      }
      if (dateFrom) {
        leadsParams.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        leadsParams.append('dateTo', dateTo);
      }
      leadsParams.append('analytics', 'true');

      const leadsRes = await api.get(`/leads?${leadsParams.toString()}`);
      const leadsData = Array.isArray(leadsRes.data)
        ? leadsRes.data
        : leadsRes.data?.data?.leads || leadsRes.data?.data || [];
      setLeads(Array.isArray(leadsData) ? leadsData : []);

      const followUpsParams = new URLSearchParams();
      if (isAdmin && selectedBranchId) {
        followUpsParams.append('branchId', selectedBranchId);
      }
      if (selectedUserId && selectedUserId !== 'all') {
        followUpsParams.append('assignedTo', selectedUserId);
      }
      if (dateFrom) {
        followUpsParams.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        followUpsParams.append('dateTo', dateTo);
      }

      const followUpsRes = await api.get(`/followups?${followUpsParams.toString()}`);
      const followUpsData = Array.isArray(followUpsRes.data)
        ? followUpsRes.data
        : followUpsRes.data?.data?.followUps || followUpsRes.data?.data || [];
      setFollowUps(Array.isArray(followUpsData) ? followUpsData : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, selectedUserId, filterKey]);

  const calculateUserStats = (userId: string) => {
    const userLeads = leads.filter(l => l.assignedTo === userId);
    const userFollowUps = followUps.filter(f => f.assignedTo === userId);

    const totalLeads = userLeads.length;
    const wonLeads = userLeads.filter(l => l.status === 'WON').length;
    const freshLeads = userLeads.filter(l => l.status === 'FRESH').length;
    const hotLeads = userLeads.filter(l => l.status === 'HOT').length;

    const totalFollowUps = userFollowUps.length;
    const completedFollowUps = userFollowUps.filter(f => f.status === 'DONE').length;
    const overdueFollowUps = userFollowUps.filter(f => f.status === 'OVERDUE').length;
    const pendingFollowUps = userFollowUps.filter(
      f => f.status === 'PENDING' || f.status === 'RESCHEDULED'
    ).length;

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
    const followUpCompletionRate =
      totalFollowUps > 0 ? ((completedFollowUps / totalFollowUps) * 100).toFixed(1) : '0';

    return {
      totalLeads,
      wonLeads,
      freshLeads,
      hotLeads,
      totalFollowUps,
      completedFollowUps,
      overdueFollowUps,
      pendingFollowUps,
      conversionRate,
      followUpCompletionRate,
    };
  };

  const chartData = users.slice(0, 6).map(u => {
    const stats = calculateUserStats(u.id);
    return {
      name: u.name.length > 10 ? u.name.substring(0, 10) + '...' : u.name,
      leads: stats.totalLeads,
      won: stats.wonLeads,
      hot: stats.hotLeads,
      followUps: stats.completedFollowUps,
    };
  });

  const rankedUsers = users
    .map(u => ({
      ...u,
      stats: calculateUserStats(u.id),
    }))
    .sort((a, b) => {
      if (b.stats.wonLeads !== a.stats.wonLeads) {
        return b.stats.wonLeads - a.stats.wonLeads;
      }
      return b.stats.totalLeads - a.stats.totalLeads;
    });

  const selectedUserStats =
    selectedUserId && selectedUserId !== 'all' ? calculateUserStats(selectedUserId) : null;
  const selectedUserData = users.find(u => u.id === selectedUserId);

  const getBranchName = () => {
    if (isAdmin && selectedBranchId) {
      const branch = branches.find(b => b.id === selectedBranchId);
      return branch?.name || 'Unknown Branch';
    }
    return user?.branch?.name || 'My Branch';
  };

  const getDateRangeLabel = () => {
    if (dateFrom && dateTo) {
      return `${dateFrom} to ${dateTo}`;
    } else if (dateFrom) {
      return `From ${dateFrom}`;
    } else if (dateTo) {
      return `Until ${dateTo}`;
    }
    return 'All Time';
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setFilterKey(k => k + 1);
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader title="Team Performance" />
        <LoadingSkeleton rows={10} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Team Performance"
        description={`${getBranchName()} | ${users.length} users | ${leads.length} leads`}
      />

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col xs:flex-row gap-2 mb-4 sm:mb-6">
        <div className="flex flex-wrap xs:flex-nowrap gap-2">
          {isAdmin && (
            <Select
              value={selectedBranchId || 'all'}
              onValueChange={v => {
                setSelectedBranchId(v === 'all' ? '' : v);
                setSelectedUserId('all');
              }}
            >
              <SelectTrigger className="w-full xs:w-36 h-9">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full xs:w-36 h-9">
              <SelectValue placeholder="Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between xs:justify-start gap-2 px-3 py-2 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {getBranchName()}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] xs:text-xs">
            {users.length}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="h-9 gap-1 sm:gap-2"
        >
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">
            {dateFrom || dateTo ? getDateRangeLabel() : 'Date Range'}
          </span>
          {dateFrom || dateTo ? (
            <span className="sm:hidden text-primary font-medium">{getDateRangeLabel()}</span>
          ) : null}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterKey(k => k + 1)}
          className="h-9 gap-1 sm:gap-2"
        >
          <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">Apply</span>
        </Button>
      </div>

      {/* Custom Date Filter */}
      {showDateFilter && (
        <Card className="mb-4 p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setShowDateFilter(false);
                  setFilterKey(k => k + 1);
                }}
                className="h-9"
              >
                Apply
              </Button>
              {(dateFrom || dateTo) && (
                <Button size="sm" variant="ghost" onClick={clearDateFilter} className="h-9 gap-1">
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDateFilter(false)}
                className="h-9"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Selected User Stats */}
      {selectedUserData && selectedUserStats && (
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-foreground">
            {selectedUserData.name}&apos;s Performance
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <PerformanceStatCard
              icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
              label="Leads"
              value={selectedUserStats.totalLeads}
              color="primary"
            />
            <PerformanceStatCard
              icon={<Trophy className="h-4 w-4 sm:h-5 sm:w-5" />}
              label="Won"
              value={selectedUserStats.wonLeads}
              color="success"
            />
            <PerformanceStatCard
              icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />}
              label="Conv %"
              value={`${selectedUserStats.conversionRate}%`}
              color="accent"
            />
            <PerformanceStatCard
              icon={<CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
              label="F/U Done"
              value={selectedUserStats.completedFollowUps}
              color="warning"
            />
            <PerformanceStatCard
              icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
              label="Overdue"
              value={selectedUserStats.overdueFollowUps}
              color="destructive"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto inline-flex shrink-0">
            <TabsTrigger value="overview">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="rankings">
              <Trophy className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Rankings</span>
            </TabsTrigger>
            <TabsTrigger value="details">
              <Target className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card className="shadow-brand">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Leads by Team Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e4" />
                      <XAxis dataKey="name" stroke="#78736f" />
                      <YAxis stroke="#78736f" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e8e6e4',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="leads" fill="#db0201" name="Total Leads" />
                      <Bar dataKey="won" fill="#1a1918" name="Won" />
                      <Bar dataKey="hot" fill="#f79694" name="Hot" />
                    </RechartsBar>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No data available</p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      {users.length === 0 ? 'No users found in selected branch' : 'No leads found'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-brand">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Phone className="h-4 w-4 text-primary" />
                  Follow-ups Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e4" />
                      <XAxis dataKey="name" stroke="#78736f" />
                      <YAxis stroke="#78736f" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e8e6e4',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="followUps" fill="#57534f" name="Follow-ups Done" />
                    </RechartsBar>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No follow-ups found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings">
          <Card className="shadow-brand">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankedUsers.length > 0 ? (
                <>
                  {/* Mobile card view */}
                  <div className="lg:hidden space-y-2">
                    {rankedUsers.map((u, index) => (
                      <div
                        key={u.id}
                        className={cn(
                          'p-3 rounded-xl border transition-all duration-200',
                          index < 3 ? 'bg-warning/5 border-warning/30' : 'bg-card border-border'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {index === 0
                                ? '🥇'
                                : index === 1
                                  ? '🥈'
                                  : index === 2
                                    ? '🥉'
                                    : `#${index + 1}`}
                            </span>
                            <div>
                              <p className="font-medium text-sm text-foreground">{u.name}</p>
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {roleLabel(u.role)}
                                </Badge>
                                {isAdmin && u.branch?.name && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {u.branch.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={
                              parseFloat(u.stats.conversionRate) >= 20
                                ? 'bg-accent/10 text-accent border-accent/20'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {u.stats.conversionRate}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-1.5 bg-muted/50 rounded-lg border">
                            <span className="font-semibold text-foreground">
                              {u.stats.totalLeads}
                            </span>
                            <p className="text-muted-foreground">Leads</p>
                          </div>
                          <div className="p-1.5 bg-success/10 rounded-lg border border-success/20 text-success">
                            <span className="font-semibold">{u.stats.wonLeads}</span>
                            <p className="text-success/70">Won</p>
                          </div>
                          <div className="p-1.5 bg-warning/10 rounded-lg border border-warning/20 text-warning">
                            <span className="font-semibold">{u.stats.hotLeads}</span>
                            <p className="text-warning/70">Hot</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 font-semibold">Rank</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          {isAdmin && <TableHead className="font-semibold">Branch</TableHead>}
                          <TableHead className="text-center font-semibold">Total Leads</TableHead>
                          <TableHead className="text-center font-semibold">Won</TableHead>
                          <TableHead className="text-center font-semibold">Hot</TableHead>
                          <TableHead className="text-center font-semibold">Conversion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankedUsers.map((u, index) => (
                          <TableRow
                            key={u.id}
                            className={cn(
                              'transition-all duration-150',
                              index < 3 ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-muted/30'
                            )}
                          >
                            <TableCell className="text-muted-foreground">
                              {index === 0
                                ? '🥇'
                                : index === 1
                                  ? '🥈'
                                  : index === 2
                                    ? '🥉'
                                    : `#${index + 1}`}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{roleLabel(u.role)}</Badge>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Badge variant="secondary">{u.branch?.name || '-'}</Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-center text-foreground">
                              {u.stats.totalLeads}
                            </TableCell>
                            <TableCell className="text-center text-success font-medium">
                              {u.stats.wonLeads}
                            </TableCell>
                            <TableCell className="text-center text-warning">
                              {u.stats.hotLeads}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  parseFloat(u.stats.conversionRate) >= 20
                                    ? 'bg-accent/10 text-accent border-accent/20'
                                    : 'bg-muted text-muted-foreground'
                                }
                              >
                                {u.stats.conversionRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/30 mb-3 sm:mb-4" />
                  <p className="text-muted-foreground">No staff members found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="shadow-brand">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                Detailed Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankedUsers.length > 0 ? (
                <>
                  {/* Mobile card view */}
                  <div className="lg:hidden space-y-2">
                    {rankedUsers.map((u, index) => (
                      <div
                        key={u.id}
                        className={cn(
                          'p-3 rounded-xl border transition-all duration-200',
                          index < 3
                            ? 'bg-accent/5 border-accent/30'
                            : 'bg-card border-border hover:border-accent/30'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {index === 0
                                ? '🥇'
                                : index === 1
                                  ? '🥈'
                                  : index === 2
                                    ? '🥉'
                                    : `#${index + 1}`}
                            </span>
                            <div>
                              <p className="font-medium text-sm text-foreground">{u.name}</p>
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">
                                  {roleLabel(u.role)}
                                </Badge>
                                {isAdmin && u.branch?.name && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {u.branch.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={
                              parseFloat(u.stats.conversionRate) >= 20
                                ? 'bg-accent/10 text-accent border-accent/20'
                                : 'bg-muted'
                            }
                          >
                            {u.stats.conversionRate}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                          <div className="p-1.5 bg-muted/50 rounded-lg border">
                            <span className="font-semibold text-foreground">
                              {u.stats.totalLeads}
                            </span>
                            <p className="text-muted-foreground">Leads</p>
                          </div>
                          <div className="p-1.5 bg-muted/50 rounded-lg border">
                            <span className="font-semibold text-foreground">
                              {u.stats.freshLeads}
                            </span>
                            <p className="text-muted-foreground">Fresh</p>
                          </div>
                          <div className="p-1.5 bg-warning/10 rounded-lg border border-warning/20 text-warning">
                            <span className="font-semibold">{u.stats.hotLeads}</span>
                            <p className="text-warning/70">Hot</p>
                          </div>
                          <div className="p-1.5 bg-success/10 rounded-lg border border-success/20 text-success">
                            <span className="font-semibold">{u.stats.wonLeads}</span>
                            <p className="text-success/70">Won</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] mt-2 pt-2 border-t">
                          <div className="p-1 bg-muted/30 rounded">
                            <span className="font-medium text-foreground">
                              {u.stats.pendingFollowUps}
                            </span>
                            <p className="text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-1 bg-accent/10 rounded">
                            <span className="font-medium text-accent">
                              {u.stats.completedFollowUps}
                            </span>
                            <p className="text-accent/70">Done</p>
                          </div>
                          <div className="p-1 bg-destructive/5 rounded">
                            <span
                              className={
                                u.stats.overdueFollowUps > 0
                                  ? 'font-medium text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              {u.stats.overdueFollowUps}
                            </span>
                            <p className="text-muted-foreground">Overdue</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          {isAdmin && <TableHead className="font-semibold">Branch</TableHead>}
                          <TableHead className="text-center font-semibold">Leads</TableHead>
                          <TableHead className="text-center font-semibold text-warning">
                            Fresh
                          </TableHead>
                          <TableHead className="text-center font-semibold text-warning">
                            Hot
                          </TableHead>
                          <TableHead className="text-center font-semibold text-success">
                            Won
                          </TableHead>
                          <TableHead className="text-center font-semibold text-muted-foreground">
                            Pending
                          </TableHead>
                          <TableHead className="text-center font-semibold text-accent">
                            Done
                          </TableHead>
                          <TableHead className="text-center font-semibold text-destructive">
                            Overdue
                          </TableHead>
                          <TableHead className="text-center font-semibold">Conv %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankedUsers.map((u, index) => (
                          <TableRow
                            key={u.id}
                            className={cn(
                              'transition-all duration-150',
                              index < 3 ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-muted/30'
                            )}
                          >
                            <TableCell className="text-muted-foreground font-medium">
                              {index === 0
                                ? '🥇'
                                : index === 1
                                  ? '🥈'
                                  : index === 2
                                    ? '🥉'
                                    : `#${index + 1}`}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {u.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{roleLabel(u.role)}</Badge>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-muted-foreground">
                                {u.branch?.name || '-'}
                              </TableCell>
                            )}
                            <TableCell className="text-center font-semibold text-foreground">
                              {u.stats.totalLeads}
                            </TableCell>
                            <TableCell className="text-center text-warning font-medium">
                              {u.stats.freshLeads}
                            </TableCell>
                            <TableCell className="text-center text-warning font-medium">
                              {u.stats.hotLeads}
                            </TableCell>
                            <TableCell className="text-center text-success font-bold">
                              {u.stats.wonLeads}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {u.stats.pendingFollowUps}
                            </TableCell>
                            <TableCell className="text-center text-accent font-medium">
                              {u.stats.completedFollowUps}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-center font-medium',
                                u.stats.overdueFollowUps > 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {u.stats.overdueFollowUps}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  parseFloat(u.stats.conversionRate) >= 20
                                    ? 'bg-accent/10 text-accent border-accent/20'
                                    : 'bg-muted'
                                }
                              >
                                {u.stats.conversionRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/30 mb-3 sm:mb-4" />
                  <p className="text-muted-foreground">No staff members found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

function PerformanceStatCard({
  icon,
  label,
  value,
  color = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
}) {
  const colorMap = {
    primary: {
      bg: 'bg-primary/5',
      border: 'border-primary/10',
      icon: 'bg-primary/10 text-primary',
      text: 'text-primary',
    },
    accent: {
      bg: 'bg-accent/5',
      border: 'border-accent/10',
      icon: 'bg-accent/10 text-accent',
      text: 'text-accent',
    },
    success: {
      bg: 'bg-success/5',
      border: 'border-success/10',
      icon: 'bg-success/10 text-success',
      text: 'text-success',
    },
    warning: {
      bg: 'bg-warning/5',
      border: 'border-warning/10',
      icon: 'bg-warning/10 text-warning',
      text: 'text-warning',
    },
    destructive: {
      bg: 'bg-destructive/5',
      border: 'border-destructive/10',
      icon: 'bg-destructive/10 text-destructive',
      text: 'text-destructive',
    },
  };

  const styles = colorMap[color];

  return (
    <Card
      className={cn(
        'border shadow-brand hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5',
        styles.bg,
        styles.border
      )}
    >
      <CardContent className="pt-3 sm:pt-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
          <div className={cn('p-1.5 rounded-lg', styles.icon)}>{icon}</div>
          <p className={cn('text-xs sm:text-sm', styles.text)}>{label}</p>
        </div>
        <p className={cn('text-xl sm:text-2xl font-bold stat-number', styles.text)}>{value}</p>
      </CardContent>
    </Card>
  );
}
