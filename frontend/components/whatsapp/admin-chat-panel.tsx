'use client';

import { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useAdminWhatsAppConversation, useDeleteChat } from '@/hooks/useWhatsApp';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Building2,
  User as UserIcon,
  Info,
  Eye,
  Check,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WhatsAppMessage } from '@/types';

interface AdminChatPanelProps {
  contactId: string;
  onBack: () => void;
}

export function AdminChatPanel({ contactId, onBack }: AdminChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Deleting is permanent (messages included), so it goes through a confirm.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteChat();

  const { data: conversation, isLoading, refetch } = useAdminWhatsAppConversation(contactId);

  const messages: WhatsAppMessage[] = conversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [contactId, refetch]);

  const contactName = conversation?.contact?.contactName || conversation?.contact?.lead?.name;

  const handleDeleteChat = () => {
    deleteMutation.mutate(contactId, {
      onSuccess: () => {
        toast.success('Chat deleted');
        setConfirmDelete(false);
        onBack();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to delete chat');
      },
    });
  };
  const ownerName = conversation?.ownerUser?.name;
  const branchName = conversation?.branch?.name;

  const getInitials = (name?: string | null) =>
    name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const formatMessageDate = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, d MMMM yyyy');
  };

  const formatMessageTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    return format(new Date(timestamp), 'HH:mm');
  };

  const getMessageStatus = (status: string | undefined, fromMe: boolean) => {
    if (!fromMe) return null;
    if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-[#db0201]" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="h-4 w-4 text-neutral-400" />;
    }
    return <Check className="h-4 w-4 text-neutral-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#e8e6e4]">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 bg-[#f5f4f3] border-b border-[#d6d3d1]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-[#57534f] hover:bg-[#f5f4f3]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-[#d9d9d9] text-[#57534f] text-sm font-medium">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#121111] text-sm truncate">
            {contactName || conversation?.contact?.contactNumber}
          </p>
          <p className="text-[11px] text-[#78736F] truncate">
            {conversation?.contact?.contactNumber}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          {branchName && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 py-0 border-[#d6d3d1] text-[#57534f] bg-white gap-1"
            >
              <Building2 className="h-3 w-3" />
              {branchName}
            </Badge>
          )}
          {ownerName && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 py-0 border-[#d6d3d1] text-[#57534f] bg-white gap-1"
            >
              <UserIcon className="h-3 w-3" />
              {ownerName}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmDelete(true)}
          disabled={!conversation}
          title="Delete chat"
          className="text-[#b00201] hover:bg-[#fff2f2] hover:text-[#b00201]"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={open => !open && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              The chat with {contactName || conversation?.contact?.contactNumber} and all of its
              messages will be permanently deleted from the CRM. This cannot be undone. It does not
              delete anything on the user&apos;s phone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={e => {
                // Keep the dialog open until the delete finishes.
                e.preventDefault();
                handleDeleteChat();
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin banner */}
      <div className="px-3 py-1.5 bg-[#fff2f2] border-b border-[#ecc9c6] flex items-center gap-2 text-[11px] text-[#b00201]">
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span>
          Admin view — you can read and delete this chat. Replying requires the assigned user to be
          signed in on their own device.
        </span>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-[#e8e6e4] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGNUY1RjciPjxnIGZpbGw9IiNFREVEQ0QiPjxnIGZpbGw9Im5vbmUiPjwvZz48L2c+PC9nPjwvZz48L3N2Zz4=')]">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-16 w-64 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-[#d9d9d9] flex items-center justify-center">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-[#d9d9d9] text-[#57534f] text-2xl font-medium">
                    {getInitials(contactName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-[#57534f] text-sm">
                {contactName || conversation?.contact?.contactNumber}
              </p>
              <p className="text-[#78736F] text-xs mt-1">No messages yet</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {messages.map((msg: WhatsAppMessage, index: number) => {
              const isOutbound = msg.direction === 'OUTBOUND';
              const showDateSeparator =
                index === 0 ||
                !isSameDay(new Date(messages[index - 1]?.sentAt ?? ''), new Date(msg.sentAt ?? ''));

              return (
                <div key={msg.id}>
                  {showDateSeparator && msg.sentAt && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[11px] text-[#57534f] bg-[#e8e6e4] px-3 py-1 rounded-full border border-[#d6d3d1]">
                        {formatMessageDate(msg.sentAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex animate-fadeIn mb-0.5',
                      isOutbound ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[65%] sm:max-w-[70%] rounded-lg px-3 py-2 relative shadow-sm',
                        isOutbound ? 'bg-[#fbe3e3] rounded-tr-none' : 'bg-white rounded-tl-none'
                      )}
                    >
                      {msg.textContent && (
                        <p className="text-sm text-[#121111] whitespace-pre-wrap break-words leading-relaxed">
                          {msg.textContent}
                        </p>
                      )}
                      {msg.mediaUrl && msg.messageType === 'IMAGE' && (
                        <img
                          src={msg.mediaUrl}
                          alt="Image"
                          className="rounded-lg max-w-full mb-1"
                        />
                      )}
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="text-[10px] text-[#78736F]">
                          {formatMessageTime(msg.sentAt ?? null)}
                        </span>
                        {isOutbound && getMessageStatus(msg.status, true)}
                        {msg.user?.name && isOutbound && (
                          <span className="text-[10px] text-[#78736F]">· {msg.user.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Read-only footer */}
      <div className="p-3 bg-[#f5f4f3] border-t border-[#d6d3d1] flex items-center gap-2">
        <div className="flex-1 bg-white border border-[#d6d3d1] rounded-3xl px-4 py-2 text-sm text-[#78736F]">
          Read-only admin view
        </div>
        <Info className="h-4 w-4 text-[#78736F] shrink-0" />
      </div>
    </div>
  );
}
