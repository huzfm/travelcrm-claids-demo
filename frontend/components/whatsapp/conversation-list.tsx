'use client';

import { useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useWhatsAppInbox } from '@/hooks/useWhatsApp';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from '@/types';
import { WhatsAppStatusIndicator } from './my-whatsapp-modal';

interface ConversationListProps {
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onOpenConnectionModal: () => void;
  onNewChat: () => void;
}

// Avatar's default ring/offset paints a white halo on this dark sidebar.
const flatAvatar = 'ring-0 ring-offset-0 hover:ring-0 active:scale-100';

export function ConversationList({
  selectedContactId,
  onSelectContact,
  selectedBranchId,
  searchInput,
  onSearchChange,
  onOpenConnectionModal,
  onNewChat,
}: ConversationListProps) {
  const effectiveBranchId = selectedBranchId === 'all' ? undefined : selectedBranchId;

  // No delete here: chats can only be deleted by an admin, from the All WhatsApp view.
  const { data: inbox, isLoading: inboxLoading } = useWhatsAppInbox(effectiveBranchId);

  const filteredConversations = useMemo(() => {
    const conversations = inbox?.conversations || [];
    const query = searchInput.toLowerCase();
    return conversations.filter(
      (c: WhatsAppConversation) =>
        c.contactName?.toLowerCase().includes(query) ||
        c.contactNumber.includes(query) ||
        c.lead?.name?.toLowerCase().includes(query)
    );
  }, [inbox, searchInput]);

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
    <div className="flex flex-col h-full min-h-0 bg-[#121111] text-white">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between gap-3 bg-[#1c1b1a] border-b border-[#2a2826] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className={cn('h-9 w-9', flatAvatar)}>
            <AvatarFallback className="bg-[#db0201] text-white text-xs font-semibold ring-0">
              WA
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-[15px] text-neutral-100">Chats</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="h-9 w-9 rounded-full text-neutral-300 hover:text-white hover:bg-white/10"
            title="New chat"
          >
            <MessageSquarePlus className="h-[18px] w-[18px]" />
          </Button>
          <WhatsAppStatusIndicator onClick={onOpenConnectionModal} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2.5 shrink-0 border-b border-[#2a2826]">
        <Input
          icon={<Search className="h-4 w-4 text-neutral-500" />}
          placeholder="Search chats"
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          className="h-9 bg-[#1f1e1d] border-0 text-sm text-white placeholder:text-neutral-500 hover:border-0 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
        />
      </div>

      {/* Chat List — a plain scroller: Radix ScrollArea's table-layout viewport
          lets rows grow past the sidebar and breaks text truncation. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {inboxLoading ? (
          <div className="py-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-[#1f1e1d] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 bg-[#1f1e1d] rounded" />
                  <div className="h-3 w-1/2 bg-[#1f1e1d] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="p-4 rounded-full bg-[#1f1e1d] mb-4">
              <MessagesSquare className="h-8 w-8 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-300 mb-1">
              {searchInput ? 'No matching chats' : 'No conversations yet'}
            </p>
            <p className="text-xs text-neutral-500">
              {searchInput ? 'Try a different name or number' : 'Messages will appear here'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv: WhatsAppConversation) => {
            const isSelected = selectedContactId === conv.contactId;
            const hasUnread = conv.unreadCount > 0;
            const title = conv.lead?.name || conv.contactName || conv.contactNumber;

            return (
              <button
                type="button"
                key={conv.contactId}
                onClick={() => onSelectContact(conv.contactId)}
                className={cn(
                  'group w-full flex items-center gap-3 pl-3.5 pr-4 text-left transition-colors',
                  'border-l-2 border-transparent hover:bg-white/[0.04]',
                  isSelected && 'bg-white/[0.08] border-[#db0201] hover:bg-white/[0.08]'
                )}
              >
                <Avatar className={cn('h-11 w-11', flatAvatar)}>
                  <AvatarFallback
                    className={cn(
                      'text-sm font-semibold ring-0',
                      hasUnread ? 'bg-[#db0201] text-white' : 'bg-[#2a2826] text-neutral-200'
                    )}
                  >
                    {getInitials(title)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 py-3 border-b border-[#232120] group-last:border-b-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm truncate',
                        hasUnread ? 'font-semibold text-white' : 'font-medium text-neutral-100'
                      )}
                    >
                      {title}
                    </p>
                    <span
                      className={cn(
                        'text-[11px] shrink-0',
                        hasUnread ? 'text-[#ff4d4d] font-medium' : 'text-neutral-500'
                      )}
                    >
                      {formatTimestamp(conv.lastMessageAt ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p
                      className={cn(
                        'text-xs truncate',
                        hasUnread ? 'text-neutral-200' : 'text-neutral-400'
                      )}
                    >
                      {conv.lastMessage || conv.contactNumber}
                    </p>
                    {hasUnread ? (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#db0201] text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    ) : (
                      conv.branchName && (
                        <span className="max-w-[40%] truncate text-[10px] text-neutral-500 shrink-0">
                          {conv.branchName}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Status */}
      <div className="px-3 py-2.5 bg-[#1c1b1a] border-t border-[#2a2826] text-center shrink-0">
        <p className="text-[11px] text-neutral-500">
          Your personal messages are end-to-end encrypted
        </p>
      </div>
    </div>
  );
}
