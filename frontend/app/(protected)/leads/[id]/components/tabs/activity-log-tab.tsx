'use client';

import { format } from 'date-fns';
import {
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Star,
  User,
  ArrowRightLeft,
  Clock,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { ActivityType } from '@/types';

const activityIcons: Record<string, React.ElementType> = {
  NOTE: FileText,
  CALL: Phone,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  SENT_VOICEMAIL: Phone,
  CALL_DECLINED: Phone,
  CALL_BACK_SCHEDULED: Phone,
  CALL_CONNECTED: Phone,
  VISIT: Users,
  MEETING: Users,
  STATUS_CHANGE: Star,
  ASSIGNMENT: User,
  TRANSFER: ArrowRightLeft,
};

const typeColors: Record<string, string> = {
  NOTE: 'bg-neutral-500',
  CALL: 'bg-neutral-500',
  WHATSAPP: 'bg-neutral-500',
  EMAIL: 'bg-neutral-500',
  STATUS_CHANGE: 'bg-neutral-500',
  ASSIGNMENT: 'bg-red-500',
  TRANSFER: 'bg-red-500',
  SENT_VOICEMAIL: 'bg-red-500',
  CALL_DECLINED: 'bg-red-500',
  CALL_BACK_SCHEDULED: 'bg-neutral-500',
  CALL_CONNECTED: 'bg-neutral-600',
  VISIT: 'bg-neutral-500',
  MEETING: 'bg-neutral-500',
};

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt?: string;
  user?: { name: string };
}

interface ActivityLogTabProps {
  activities: Activity[];
  isAdmin: boolean;
  isManager: boolean;
  isLeadOwner: boolean;
  showForm: boolean;
  activityType: ActivityType;
  activityContent: string;
  onTypeChange: (v: ActivityType) => void;
  onContentChange: (v: string) => void;
  onToggleForm: () => void;
  onAdd: () => void;
  onCancel: () => void;
  isAdding: boolean;
}

export function ActivityLogTab({
  activities,
  isAdmin,
  isManager,
  isLeadOwner,
  showForm,
  activityType,
  activityContent,
  onTypeChange,
  onContentChange,
  onToggleForm,
  onAdd,
  onCancel,
  isAdding,
}: ActivityLogTabProps) {
  const canAdd = isAdmin || isManager || isLeadOwner;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="hidden sm:inline">Activity Log</span>
            <span className="sm:hidden">Activities</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {activities.length}
            </Badge>
          </CardTitle>
          {canAdd && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleForm}
              className="text-[10px] sm:text-xs px-2 sm:px-3 shrink-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Activity</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4">
        {/* Inline Add Activity Form */}
        {showForm && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg bg-muted/20 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                  Type
                </label>
                <Select value={activityType} onValueChange={v => onTypeChange(v as ActivityType)}>
                  <SelectTrigger className="h-8 sm:h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="VISIT">Visit</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={onAdd}
                  disabled={!activityContent.trim() || isAdding}
                >
                  {isAdding ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <Textarea
                placeholder="Describe the activity..."
                value={activityContent}
                onChange={e => onContentChange(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {activities.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
              <p className="text-xs sm:text-sm text-muted-foreground">No activities recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {activities.map((activity, index) => {
                const Icon = activityIcons[activity.type] || FileText;
                const isLast = index === activities.length - 1;
                const colorClass = typeColors[activity.type] || 'bg-primary';

                return (
                  <div key={activity.id} className="flex gap-2 sm:gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${colorClass}/10 border-2 ${colorClass} flex items-center justify-center z-10`}
                      >
                        <Icon
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${colorClass.replace('bg-', 'text-')}`}
                        />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 sm:mt-2 min-h-5" />}
                    </div>
                    <div
                      className={`flex-1 pb-4 sm:pb-6 ${!isLast ? 'border-b border-border' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Badge
                          className={`${colorClass} text-white text-[10px] sm:text-xs`}
                          variant="default"
                        >
                          {activity.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground">{activity.description}</p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                        {activity.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {activity.user.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {activity.createdAt
                            ? format(new Date(activity.createdAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
