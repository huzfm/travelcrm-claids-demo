'use client';

import { useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useAdminWhatsAppInbox } from '@/hooks/useWhatsApp';
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
import { Search, Inbox, Building2, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from '@/types';

interface AdminConversationListProps {
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  userId?: string;
  onBack?: () => void;
}

export function AdminConversationList({
  selectedContactId,
  onSelectContact,
  selectedBranchId,
  onBranchChange,
  searchInput,
  onSearchChange,
  userId,
  onBack,
}: AdminConversationListProps) {
  const { data: branches } = useBranches();

  const { data: inbox, isLoading } = useAdminWhatsAppInbox({
    branchId: selectedBranchId,
    userId,
  });
  const conversations = inbox?.conversations || [];

  const filteredConversations = useMemo(() => {
    const query = searchInput.toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (c: WhatsAppConversation) =>
        c.contactName?.toLowerCase().includes(query) ||
        c.contactNumber.includes(query) ||
        c.lead?.name?.toLowerCase().includes(query) ||
        c.userName?.toLowerCase().includes(query) ||
        c.branchName?.toLowerCase().includes(query)
    );
  }, [conversations, searchInput]);

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
        {onBack && (
          <button
            onClick={onBack}
            className="h-9 w-9 shrink-0 rounded-full hover:bg-white/5 flex items-center justify-center text-neutral-300"
            title="Back to staff list"
            aria-label="Back to staff list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#db0201] text-white text-sm font-medium">
            <Inbox className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-neutral-200 block">
            {userId ? 'Conversations' : 'All Conversations'}
          </span>
          <span className="text-[11px] text-neutral-400 block">
            {inbox?.totalUnread
              ? `${inbox.totalUnread} unread · ${conversations.length} chats`
              : `${conversations.length} chats`}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 bg-[#121111] space-y-2 border-b border-[#1c1b1a]">
        <div className="relative bg-[#1c1b1a] rounded-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search name, number, branch, user"
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

      {/* Chat List */}
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
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="p-4 rounded-full bg-[#1c1b1a] mb-4">
              <Search className="h-10 w-10 text-neutral-500" />
            </div>
            <p className="text-neutral-400 mb-1">No conversations</p>
            <p className="text-sm text-neutral-500">Adjust filters or wait for new messages</p>
          </div>
        ) : (
          filteredConversations.map((conv: WhatsAppConversation) => (
            <div
              key={conv.contactId}
              onClick={() => onSelectContact(conv.contactId)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5',
                selectedContactId === conv.contactId && 'bg-white/10'
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarFallback
                    className={cn(
                      'text-base font-medium bg-[#1c1b1a] text-neutral-200',
                      conv.unreadCount > 0 && 'bg-[#db0201]/20 text-[#db0201]'
                    )}
                  >
                    {getInitials(conv.lead?.name || conv.contactName || conv.contactNumber)}
                  </AvatarFallback>
                </Avatar>
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#db0201] flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0 border-b border-[#1c1b1a]/50">
                <div className="flex justify-between items-center">
                  <p
                    className={cn(
                      'text-sm truncate text-neutral-100',
                      conv.unreadCount > 0 && 'font-semibold'
                    )}
                  >
                    {conv.lead?.name || conv.contactName || conv.contactNumber}
                  </p>
                  <span
                    className={cn(
                      'text-[11px] shrink-0',
                      conv.unreadCount > 0 ? 'text-[#db0201]' : 'text-neutral-500'
                    )}
                  >
                    {formatTimestamp(conv.lastMessageAt ?? null)}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {conv.lastMessage || conv.contactNumber}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {conv.branchName && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 py-0 border-[#3F3C39] text-neutral-400 bg-transparent gap-1"
                    >
                      <Building2 className="h-2.5 w-2.5" />
                      {conv.branchName}
                    </Badge>
                  )}
                  {conv.userName && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 py-0 border-[#3F3C39] text-neutral-400 bg-transparent gap-1"
                    >
                      <UserIcon className="h-2.5 w-2.5" />
                      {conv.userName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
