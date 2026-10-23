'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isToday, isBefore, addDays } from 'date-fns';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  useFollowUps,
  useMarkFollowUpDone,
  useRescheduleFollowUp,
  useDeleteFollowUp,
} from '@/hooks/useFollowUps';
import { TravelStatusBadge } from '@/components/ui/travel-card';
import {
  CalendarIcon,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Video,
  Users,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FollowUp } from '@/types';
import { cn } from '@/lib/utils';

const followUpTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  CALL: { icon: Phone, color: 'text-status-new', bg: 'bg-status-new/10 border-status-new/20' },
  MEETING: {
    icon: Users,
    color: 'text-status-proposal',
    bg: 'bg-status-proposal/10 border-status-proposal/20',
  },
  VISIT: { icon: MapPin, color: 'text-stage-won', bg: 'bg-stage-won/10 border-stage-won/20' },
  EMAIL: { icon: Mail, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  WHATSAPP: {
    icon: MessageSquare,
    color: 'text-wa-green',
    bg: 'bg-wa-green/10 border-wa-green/20',
  },
  VIDEO_CALL: { icon: Video, color: 'text-stage-hot', bg: 'bg-stage-hot/10 border-stage-hot/20' },
  OTHER: { icon: CalendarIcon, color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/20' },
};

const TABS = ['today', 'overdue', 'upcoming'] as const;
type FollowUpTab = (typeof TABS)[number];

export default function FollowUpsPage() {
  // The dashboard links here with ?range=, e.g. /followups?range=overdue.
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('range');
  const initialTab: FollowUpTab = TABS.includes(requestedTab as FollowUpTab)
    ? (requestedTab as FollowUpTab)
    : 'today';

  const { data: followUpsData, isLoading, refetch } = useFollowUps();
  const markDone = useMarkFollowUpDone();
  const reschedule = useRescheduleFollowUp();
  const deleteFollowUp = useDeleteFollowUp();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const allFollowUps: FollowUp[] = Array.isArray(followUpsData) ? followUpsData : [];

  const now = new Date();

  const todayList = allFollowUps.filter(f => isToday(new Date(f.scheduledAt)));
  const overdueList = allFollowUps.filter(f => {
    const date = new Date(f.scheduledAt);
    return isBefore(date, now) && f.status !== 'DONE';
  });
  const upcomingList = allFollowUps.filter(f => {
    const date = new Date(f.scheduledAt);
    return !isToday(date) && isBefore(now, date) && isBefore(date, addDays(now, 7));
  });

  const handleMarkDone = async (id: string) => {
    try {
      await markDone.mutateAsync(id);
      toast.success('Follow-up completed!');
      refetch();
    } catch {
      toast.error('Failed to mark as done');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !selectedDate) return;
    try {
      await reschedule.mutateAsync({ id: rescheduleId, scheduledAt: selectedDate.toISOString() });
      toast.success('Rescheduled!');
      setRescheduleId(null);
      setSelectedDate(new Date());
      refetch();
    } catch {
      toast.error('Failed to reschedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      await deleteFollowUp.mutateAsync(id);
      toast.success('Follow-up deleted!');
      setRescheduleId(null);
      refetch();
    } catch {
      toast.error('Failed to delete follow-up');
    }
  };

  // Keyboard shortcut: press 'n' to create new follow-up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        // Could open create dialog here
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PageWrapper>
      <PageHeader title="Follow-ups" description="Manage your travel client follow-ups and tasks" />

      <Tabs defaultValue={initialTab} key={initialTab} className="w-full">
        {/* Scrollable tabs on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto inline-flex shrink-0">
            <TabsTrigger value="today">
              <CalendarIcon className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Today</span>
              <Badge
                variant="secondary"
                className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-4 sm:min-w-5 justify-center rounded-full px-1 text-[8px] sm:text-[10px] font-bold"
              >
                {todayList.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue">
              <AlertTriangle className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Overdue</span>
              {overdueList.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-4 sm:min-w-5 justify-center rounded-full px-1 text-[8px] sm:text-[10px] font-bold animate-pulse"
                >
                  {overdueList.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              <Clock className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Upcoming</span>
              <Badge
                variant="secondary"
                className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-4 sm:min-w-5 justify-center rounded-full px-1 text-[8px] sm:text-[10px] font-bold"
              >
                {upcomingList.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 bg-muted/50 animate-pulse-skeleton rounded-xl"
                />
              ))}
            </div>
          ) : (
            <FollowUpList
              followUps={todayList}
              onMarkDone={handleMarkDone}
              onReschedule={id => setRescheduleId(id)}
              onDelete={handleDelete}
              isMarkingDone={markDone.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 bg-muted/50 animate-pulse-skeleton rounded-xl"
                />
              ))}
            </div>
          ) : (
            <FollowUpList
              followUps={overdueList}
              onMarkDone={handleMarkDone}
              onReschedule={id => setRescheduleId(id)}
              onDelete={handleDelete}
              isOverdue
              isMarkingDone={markDone.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 sm:mt-6">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 bg-muted/50 animate-pulse-skeleton rounded-xl"
                />
              ))}
            </div>
          ) : (
            <FollowUpList
              followUps={upcomingList}
              onMarkDone={handleMarkDone}
              onReschedule={id => setRescheduleId(id)}
              onDelete={handleDelete}
              isMarkingDone={markDone.isPending}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleId} onOpenChange={open => !open && setRescheduleId(null)}>
        <DialogContent className="max-w-sm sm:max-w-md w-[calc(100%-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-accent" />
              Reschedule Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-2 sm:py-4">
            <Calendar
              selected={selectedDate}
              onSelect={date => {
                if (date && !(date as any).startDate) setSelectedDate(date as Date);
              }}
              className="mx-auto"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                handleDelete(rescheduleId!);
                setRescheduleId(null);
              }}
              className="w-full sm:w-auto text-xs"
            >
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleMarkDone(rescheduleId!);
                  setRescheduleId(null);
                }}
                className="flex-1 sm:flex-none text-xs"
              >
                <CheckCircle className="mr-1 h-3 w-3" /> Done
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRescheduleId(null);
                  setSelectedDate(new Date());
                }}
                className="flex-1 sm:flex-none text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReschedule}
                disabled={!selectedDate}
                className="flex-1 sm:flex-none text-xs"
              >
                Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function FollowUpList({
  followUps,
  onMarkDone,
  onReschedule,
  onDelete,
  isOverdue = false,
  isMarkingDone = false,
}: {
  followUps: FollowUp[];
  onMarkDone: (id: string) => void;
  onReschedule: (id: string) => void;
  onDelete: (id: string) => void;
  isOverdue?: boolean;
  isMarkingDone?: boolean;
}) {
  if (followUps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-16 text-center animate-fade-in">
        <div
          className={cn(
            'mb-3 sm:mb-4 rounded-full p-3 sm:p-4',
            isOverdue ? 'bg-destructive/10' : 'bg-stage-won/10'
          )}
        >
          {isOverdue ? (
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
          ) : (
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-stage-won" />
          )}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          {isOverdue ? 'No overdue follow-ups' : 'All caught up!'}
          {!isOverdue && <Sparkles className="h-4 w-4 text-gold" />}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isOverdue
            ? 'Great work keeping on top of your tasks'
            : 'No follow-ups scheduled for this period'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {followUps.map(fu => {
        const typeConfig = followUpTypeConfig[fu.type] || followUpTypeConfig.OTHER;
        const Icon = typeConfig.icon;
        const isPending =
          fu.status === 'PENDING' || fu.status === 'RESCHEDULED' || fu.status === 'OVERDUE';
        const isDone = fu.status === 'DONE';

        return (
          <Card
            key={fu.id}
            className={cn(
              'shadow-brand hover:shadow-brand-lg transition-all duration-200 overflow-hidden group',
              isDone && 'opacity-60',
              isOverdue && !isDone && 'border-l-4 border-l-destructive'
            )}
          >
            <CardContent className="p-3 sm:p-4 lg:py-4 lg:px-5">
              {/* Mobile Layout */}
              <div className="lg:hidden">
                <div className="flex items-start gap-3">
                  <div className={cn('shrink-0 rounded-lg p-2 border', typeConfig.bg)}>
                    <Icon className={cn('h-4 w-4', typeConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">
                        {fu.lead?.name || 'Unknown Lead'}
                      </p>
                      <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                        {fu.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span>{format(new Date(fu.scheduledAt), 'MMM d')}</span>
                      <span className="font-mono">
                        {format(new Date(fu.scheduledAt), 'h:mm a')}
                      </span>
                    </div>
                    {(fu.assignee?.name || fu.assignedToUser?.name) && (
                      <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          <span className="font-normal opacity-80">Assigned to </span>
                          {fu.assignee?.name || fu.assignedToUser?.name}
                        </span>
                      </span>
                    )}
                    {fu.notes && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">
                        {fu.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mobile Actions */}
                {isPending && (
                  <div className="flex gap-2 mt-3 ml-11">
                    <Button
                      size="sm"
                      onClick={() => onMarkDone(fu.id)}
                      disabled={isMarkingDone}
                      className="h-8 text-[10px] px-2 shadow-sm"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" /> Done
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReschedule(fu.id)}
                      className="h-8 text-[10px] px-2"
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" /> Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(fu.id)}
                      className="h-8 w-8 min-w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {isDone && (
                  <div className="flex items-center justify-between mt-3 ml-11">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(fu.id)}
                      className="h-8 w-8 min-w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Badge variant="confirmed" className="text-[10px] gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                    </Badge>
                  </div>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex items-center justify-between group-hover:bg-muted/20 -mx-4 px-4 transition-colors rounded-lg">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      'shrink-0 rounded-xl p-3 border transition-transform group-hover:scale-105',
                      typeConfig.bg,
                      typeConfig.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-foreground">
                        {fu.lead?.name || 'Unknown Lead'}
                      </p>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {fu.type.replace(/_/g, ' ')}
                      </Badge>
                      {fu.outcome && <TravelStatusBadge status={fu.outcome} />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(fu.scheduledAt), 'MMM d, yyyy')} at{' '}
                        {format(new Date(fu.scheduledAt), 'h:mm a')}
                      </span>
                      {(fu.assignee?.name || fu.assignedToUser?.name) && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                          <Users className="h-3 w-3" />
                          <span className="font-normal opacity-80">Assigned to</span>
                          {fu.assignee?.name || fu.assignedToUser?.name}
                        </span>
                      )}
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 italic">
                        {fu.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desktop Actions */}
                {isPending && (
                  <div className="flex gap-2 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReschedule(fu.id)}
                      className="text-xs h-8"
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3" /> Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(fu.id)}
                      className="text-xs h-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onMarkDone(fu.id)}
                      disabled={isMarkingDone}
                      className="text-xs h-8 shadow-sm"
                    >
                      <CheckCircle className="mr-1.5 h-3 w-3" /> Done
                    </Button>
                  </div>
                )}
                {isDone && (
                  <div className="flex gap-2 shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(fu.id)}
                      className="text-xs h-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                    </Button>
                    <Badge variant="confirmed" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
