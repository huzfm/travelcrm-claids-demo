'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import {
  useWhatsAppConversation,
  useSendWhatsAppMessage,
  useMyWhatsAppStatus,
} from '@/hooks/useWhatsApp';
import { useUploadFile, type StagedFile, type UploadKind } from '@/hooks/useUploadFile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft, Check, CheckCheck, Mic, QrCode, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WhatsAppMessage } from '@/types';
import { AttachmentMenu } from './AttachmentMenu';
import { AttachmentPreview } from './AttachmentPreview';
import { MediaMessage } from './MediaMessage';
import { useDragDropOverlay } from './DropZone';

interface ChatPanelProps {
  contactId: string;
  onBack: () => void;
  onRefetchConversation: () => void;
  onRefetchInbox: () => void;
  onOpenLinkLeadModal: () => void;
  onOpenCreateLeadModal: () => void;
  hasLinkedLead: boolean;
  onOpenMyWhatsApp: () => void;
}

export function ChatPanel({
  contactId,
  onBack,
  onRefetchConversation,
  onRefetchInbox,
  onOpenMyWhatsApp,
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  // Staged file — held in browser memory only, converted to a base64 dataUrl.
  // No network upload. The dataUrl is forwarded with the send request.
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [staging, setStaging] = useState(false);
  // True while a media-send POST is in flight (the base64 body can be large,
  // so the network call is the slow step).
  const [sendingMedia, setSendingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: myStatus } = useMyWhatsAppStatus();
  const isMyWhatsAppConnected = myStatus?.status === 'open';

  const {
    data: conversation,
    isLoading: convLoading,
    refetch: refetchConversation,
  } = useWhatsAppConversation(contactId);
  const sendMessage = useSendWhatsAppMessage();
  const { stageFileAsync } = useUploadFile();

  const messages = conversation?.messages || [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchConversation();
    }, 5000);
    return () => clearInterval(interval);
  }, [contactId, refetchConversation]);

  const handlePickedFile = useCallback(
    async (file: File, _kind: UploadKind) => {
      if (!isMyWhatsAppConnected) {
        toast.error('Connect your WhatsApp first to send attachments.');
        return;
      }
      setStaging(true);
      try {
        const result = await stageFileAsync(file);
        setStaged(result);
      } catch (err: any) {
        const msg = err?.message || 'Failed to read file.';
        toast.error(msg);
      } finally {
        setStaging(false);
      }
    },
    [isMyWhatsAppConnected, stageFileAsync]
  );

  const handleRemoveAttachment = useCallback(() => {
    setStaged(null);
  }, []);

  const { containerProps: dropContainerProps, overlay: dropOverlay } = useDragDropOverlay({
    disabled: !isMyWhatsAppConnected,
    onFiles: files => {
      if (!isMyWhatsAppConnected) {
        toast.error('Connect your WhatsApp first to send attachments.');
        return;
      }
      if (files.length === 0) return;
      const file = files[0];
      if (files.length > 1) {
        toast.message('Only the first file will be sent.');
      }
      let kind: UploadKind;
      if (file.type.startsWith('image/')) kind = 'image';
      else if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type.startsWith('audio/')) kind = 'audio';
      else kind = 'document';
      handlePickedFile(file, kind);
    },
  });

  const isSending = sendMessage.isPending || sendingMedia;
  const canSend =
    isMyWhatsAppConnected && !isSending && !staging && (message.trim().length > 0 || !!staged);

  const handleSendMessage = useCallback(async () => {
    if (!contactId) return;
    const caption = message.trim();
    const att = staged;
    if (!caption && !att) return;
    if (att) {
      setSendingMedia(true);
    }
    try {
      if (att) {
        // Pass the base64 dataUrl directly to the backend — no upload, no
        // Cloudinary. The backend forwards it to Evolution as the media payload.
        await sendMessage.mutateAsync({
          contactId,
          message: caption,
          type: att.mediaType,
          mediaUrl: att.dataUrl,
          documentUrl: att.mediaType === 'document' ? att.dataUrl : undefined,
          fileName: att.fileName,
          caption: caption || undefined,
          mediaType: att.mediaType,
          mediaMimeType: att.mimeType,
        });
      } else {
        await sendMessage.mutateAsync({ contactId, message: caption });
      }
      setMessage('');
      setStaged(null);
      onRefetchInbox();
      onRefetchConversation();
      messageInputRef.current?.focus();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to send message';
      toast.error(msg);
    } finally {
      setSendingMedia(false);
    }
  }, [contactId, message, staged, sendMessage, onRefetchInbox, onRefetchConversation]);

  const getInitials = (name: string) =>
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
    <div className="relative flex flex-col h-full bg-[#e8e6e4]" {...dropContainerProps}>
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
            {getInitials(conversation?.contact?.contactName || conversation?.lead?.name || '?')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#121111] text-sm">
            {conversation?.contact?.contactName ||
              conversation?.lead?.name ||
              conversation?.contact?.contactNumber}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-[#e8e6e4] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGNUY1RjciPjxnIGZpbGw9IiNFREVEQ0QiPjxnIGZpbGw9Im5vbmUiPjwvZz48L2c+PC9nPjwvZz48L3N2Zz4=')]">
        {convLoading ? (
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
                    {getInitials(
                      conversation?.contact?.contactName || conversation?.lead?.name || '?'
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-[#57534f] text-sm">
                {conversation?.contact?.contactName ||
                  conversation?.lead?.name ||
                  conversation?.contact?.contactNumber}
              </p>
              <p className="text-[#78736F] text-xs mt-1">
                WhatsApp uses your phone&apos;s internet connection
              </p>
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
                      {msg.mediaUrl && (
                        <div className={msg.textContent ? 'mt-1' : ''}>
                          <MediaMessage message={msg} isOutbound={isOutbound} />
                        </div>
                      )}
                      <div className={cn('flex items-center gap-1 justify-end mt-1')}>
                        <span className="text-[10px] text-[#78736F]">
                          {formatMessageTime(msg.sentAt ?? null)}
                        </span>
                        {isOutbound && getMessageStatus(msg.status, true)}
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

      {/* WhatsApp Status / Connect Button */}
      {!isMyWhatsAppConnected && (
        <div className="px-3 py-2 bg-[#fff2f2] border-t border-[#ecc9c6]">
          <button
            onClick={onOpenMyWhatsApp}
            className="w-full flex items-center gap-2 text-sm text-[#b00201] hover:bg-[#ecc9c6] rounded-lg px-3 py-2 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            <span className="flex-1 text-left">Connect your WhatsApp to send messages</span>
            <span className="text-xs bg-[#db0201] text-[#000] px-2 py-0.5 rounded-full">
              Connect
            </span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#f5f4f3] border-t border-[#d6d3d1]">
        {staged && (
          <AttachmentPreview
            fileName={staged.fileName}
            mimeType={staged.mimeType}
            size={staged.size}
            kind={staged.mediaType}
            dataUrl={staged.dataUrl}
            uploading={staging}
            onRemove={handleRemoveAttachment}
          />
        )}
        <div className="p-3 flex items-end gap-2">
          <AttachmentMenu
            disabled={!isMyWhatsAppConnected || staging || isSending}
            onPick={handlePickedFile}
          />

          <div className="flex-1 relative">
            <Textarea
              ref={messageInputRef}
              placeholder={
                staging
                  ? 'Reading file...'
                  : sendingMedia
                    ? 'Sending media...'
                    : staged
                      ? 'Add a caption (optional)'
                      : 'Message'
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) handleSendMessage();
                }
              }}
              className="min-h-[40px] max-h-32 resize-none pr-12 bg-white border border-[#d6d3d1] rounded-3xl text-sm text-[#121111] focus:ring-0 focus:ring-offset-0 placeholder:text-[#78736F]"
              rows={1}
              style={{
                fieldSizing: 'content' as any,
              }}
            />
            {staging && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#db0201]" />
            )}
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
            className={cn(
              'shrink-0 h-10 w-10 rounded-full transition-all',
              canSend
                ? 'bg-[#db0201] hover:bg-[#db0201]/90 text-white'
                : 'bg-[#e8e6e4] text-[#57534f]'
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : canSend ? (
              <Send className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      {dropOverlay}
    </div>
  );
}
