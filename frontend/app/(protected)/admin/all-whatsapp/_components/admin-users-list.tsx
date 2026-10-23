'use client';

import { useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useBranches } from '@/hooks/useBranches';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Inbox, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from '@/types';

export interface AdminUserSummary {
  userId: string;
  userName: string;
  userEmail: string | null;
  branchId: string;
  branchName: string | null;
  conversationCount: number;
  totalUnread: number;
  lastActivityAt: string | null;
  lastMessagePreview: string | null;
}

interface AdminUsersListProps {
  users: AdminUserSummary[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  isLoading: boolean;
}

export function AdminUsersList({
  users,
  selectedUserId,
  onSelectUser,
  searchInput,
  onSearchChange,
  selectedBranchId,
  onBranchChange,
  isLoading,
}: AdminUsersListProps) {
  const { data: branches } = useBranches();

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      u =>
        u.userName.toLowerCase().includes(q) ||
        (u.userEmail?.toLowerCase().includes(q) ?? false) ||
        (u.branchName?.toLowerCase().includes(q) ?? false) ||
        (u.lastMessagePreview?.toLowerCase().includes(q) ?? false)
    );
  }, [users, searchInput]);

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  return (
    <div className="flex flex-col h-full bg-[#121111] text-white">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 bg-[#1c1b1a] border-b border-[#363432]">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#db0201] text-white text-sm font-medium">
            <Inbox className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-neutral-200 block">All Staff WhatsApp</span>
          <span className="text-[11px] text-neutral-400 block">
            {users.length} {users.length === 1 ? 'staff' : 'staff members'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 bg-[#121111] space-y-2 border-b border-[#1c1b1a]">
        <div className="relative bg-[#1c1b1a] rounded-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search staff, branch, or last message"
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 h-10 bg-[#1c1b1a] border-0 text-white placeholder:text-neutral-400 rounded-lg focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <Select value={selectedBranchId} onValueChange={onBranchChange}>
          <SelectTrigger className="h-9 bg-[#1c1b1a] border-0 text-white text-sm focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches?.map((b: { id: string; name: string }) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      <ScrollArea className="flex-1 bg-[#121111]">
        {isLoading ? (
          <div className="p-4 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-[#1c1b1a]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[#1c1b1a] rounded" />
                  <div className="h-3 w-1/2 bg-[#1c1b1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="p-4 rounded-full bg-[#1c1b1a] mb-4">
              <Search className="h-10 w-10 text-neutral-500" />
            </div>
            {users.length === 0 ? (
              <>
                <p className="text-neutral-400 mb-1">
                  No staff members have connected WhatsApp yet
                </p>
                <p className="text-sm text-neutral-500">
                  Staff can connect their WhatsApp from the WhatsApp page
                </p>
              </>
            ) : searchInput ? (
              <p className="text-neutral-400 mb-1">No staff match &quot;{searchInput}&quot;</p>
            ) : (
              <>
                <p className="text-neutral-400 mb-1">No staff in this branch</p>
                <p className="text-sm text-neutral-500">Try a different branch</p>
              </>
            )}
          </div>
        ) : (
          filtered.map(user => (
            <div
              key={user.userId}
              onClick={() => onSelectUser(user.userId)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5',
                selectedUserId === user.userId && 'bg-white/10'
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarFallback
                    className={cn(
                      'text-base font-medium bg-[#1c1b1a] text-neutral-200',
                      user.totalUnread > 0 && 'bg-[#db0201]/20 text-[#db0201]'
                    )}
                  >
                    {getInitials(user.userName)}
                  </AvatarFallback>
                </Avatar>
                {user.totalUnread > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#db0201] flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">
                      {user.totalUnread > 9 ? '9+' : user.totalUnread}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 border-b border-[#1c1b1a]/50">
                <div className="flex justify-between items-center">
                  <p
                    className={cn(
                      'text-sm truncate text-neutral-100',
                      user.totalUnread > 0 && 'font-semibold'
                    )}
                  >
                    {user.userName}
                  </p>
                  <span
                    className={cn(
                      'text-[11px] shrink-0',
                      user.totalUnread > 0 ? 'text-[#db0201]' : 'text-neutral-500'
                    )}
                  >
                    {formatTimestamp(user.lastActivityAt)}
                  </span>
                </div>
                {user.userEmail && (
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{user.userEmail}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {user.branchName && selectedBranchId === 'all' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 py-0 border-[#3F3C39] text-neutral-400 bg-transparent gap-1"
                    >
                      <Building2 className="h-2.5 w-2.5" />
                      {user.branchName}
                    </Badge>
                  )}
                  <span className="text-[11px] text-neutral-500">
                    {user.conversationCount}{' '}
                    {user.conversationCount === 1 ? 'conversation' : 'conversations'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

// Helper exported for the parent page so the grouping logic lives next to
// the component that renders the result.
export function summarizeUsersByUserId(conversations: WhatsAppConversation[]): AdminUserSummary[] {
  const byUser = new Map<string, AdminUserSummary>();
  for (const c of conversations) {
    if (!c.userId) continue;
    const existing = byUser.get(c.userId);
    const lastAt = c.lastMessageAt ?? null;
    if (!existing) {
      byUser.set(c.userId, {
        userId: c.userId,
        userName: c.userName || 'Unknown',
        userEmail: c.userEmail ?? null,
        branchId: c.branchId || '',
        branchName: c.branchName ?? null,
        conversationCount: 1,
        totalUnread: c.unreadCount || 0,
        lastActivityAt: lastAt,
        lastMessagePreview: c.lastMessage ?? null,
      });
    } else {
      existing.conversationCount += 1;
      existing.totalUnread += c.unreadCount || 0;
      if (lastAt && (!existing.lastActivityAt || lastAt > existing.lastActivityAt)) {
        existing.lastActivityAt = lastAt;
        existing.lastMessagePreview = c.lastMessage ?? existing.lastMessagePreview;
      }
    }
  }
  return Array.from(byUser.values()).sort((a, b) => {
    if (!a.lastActivityAt && !b.lastActivityAt) return 0;
    if (!a.lastActivityAt) return 1;
    if (!b.lastActivityAt) return -1;
    return b.lastActivityAt.localeCompare(a.lastActivityAt);
  });
}
