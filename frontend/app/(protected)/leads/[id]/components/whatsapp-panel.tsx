'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { MessageCircle, Send, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaMessage } from '@/components/whatsapp/MediaMessage';
import { cn } from '@/lib/utils';
import type { Lead, WhatsAppMessage } from '@/types';

interface WhatsAppPanelProps {
  lead: Lead;
  conversation?: {
    contact?: {
      contactName?: string;
      contactNumber?: string;
    };
    lead?: {
      name?: string;
    };
    messages?: WhatsAppMessage[];
  } | null;
  isLoading: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  sendMutation: {
    isPending: boolean;
  };
}

const formatMessageDate = (timestamp: string) => {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMMM yyyy');
};

export function WhatsAppPanel({
  lead,
  conversation,
  isLoading,
  message,
  onMessageChange,
  onSend,
  sendMutation,
}: WhatsAppPanelProps) {
  const contactName = conversation?.contact?.contactName || conversation?.lead?.name || lead.name;
  const contactNumber = conversation?.contact?.contactNumber || lead.phone;
  const messages = conversation?.messages ?? [];
  const canSend = !!lead.phone && !!message.trim() && !sendMutation.isPending;
  const initials =
    contactName
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <Card className="mb-4 sm:mb-6 overflow-hidden p-0 gap-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-[#f5f4f3] border-b border-[#d6d3d1]">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
          <AvatarFallback className="text-xs sm:text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-[#121111] truncate">{contactName}</p>
          <p className="text-xs text-[#78736F] truncate">{contactNumber || 'No phone number'}</p>
        </div>
        {conversation?.contact && (
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
            <Link href="/whatsapp">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in Inbox</span>
              <span className="sm:hidden">Inbox</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-[50vh] sm:h-[420px] overflow-y-auto bg-[#e8e6e4] px-3 sm:px-4 py-3"
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
              <MessageCircle className="h-7 w-7 text-[#78736F]" />
            </div>
            <p className="text-sm font-medium text-[#57534f]">No messages yet</p>
            <p className="text-xs text-[#78736F] mt-1">
              {lead.phone
                ? `Send a message to start a WhatsApp chat with ${lead.name}`
                : 'Add a phone number to this lead to message them'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, index) => {
              const isOutbound = msg.direction === 'OUTBOUND';
              const showDate =
                !!msg.sentAt &&
                (index === 0 ||
                  !isSameDay(new Date(messages[index - 1]?.sentAt ?? ''), new Date(msg.sentAt)));

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] text-[#57534f] bg-[#f5f4f3] px-3 py-1 rounded-full border border-[#d6d3d1]">
                        {formatMessageDate(msg.sentAt!)}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
                        isOutbound ? 'bg-[#fbe3e3] rounded-tr-none' : 'bg-white rounded-tl-none'
                      )}
                    >
                      {msg.textContent && (
                        <p className="text-sm text-[#121111] whitespace-pre-wrap break-words leading-relaxed">
                          {msg.textContent}
                        </p>
                      )}
                      {msg.mediaUrl && (
                        <div className={msg.textContent ? 'mt-1' : ''}>
                          <MediaMessage message={msg} isOutbound={isOutbound} />
                        </div>
                      )}
                      {msg.sentAt && (
                        <p className="text-[10px] text-[#78736F] text-right mt-1">
                          {format(new Date(msg.sentAt), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer - always available so a first message can start the chat */}
      <div className="flex items-end gap-2 p-3 bg-[#f5f4f3] border-t border-[#d6d3d1]">
        <div className="flex-1 min-w-0">
          <Textarea
            placeholder={lead.phone ? 'Type a message' : 'Lead has no phone number'}
            value={message}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            disabled={!lead.phone}
            rows={1}
            className="min-h-[40px] max-h-32 bg-white border border-[#d6d3d1] rounded-3xl px-4 text-sm text-[#121111] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#78736F]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
        </div>
        <Button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'shrink-0 h-10 w-10 p-0 rounded-full',
            canSend
              ? 'bg-[#db0201] hover:bg-[#db0201]/90 text-white'
              : 'bg-[#e8e6e4] text-[#57534f]'
          )}
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </Card>
  );
}
