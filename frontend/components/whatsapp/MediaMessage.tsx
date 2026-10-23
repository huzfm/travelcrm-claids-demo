'use client';

import {
  FileText,
  Download,
  Film,
  Music,
} from 'lucide-react';
import type { WhatsAppMessage } from '@/types/whatsapp.types';

interface MediaMessageProps {
  message: WhatsAppMessage;
  isOutbound: boolean;
}

/**
 * Renders the body of a media-bearing WhatsApp message.
 * Branches on messageType so inbound PDF / video / audio stop showing as
 * empty bubbles. Always preserves the surrounding bubble styles used by
 * chat-panel (the parent still wraps this in the green/white bubble).
 */
export function MediaMessage({ message, isOutbound }: MediaMessageProps) {
  const { messageType, mediaUrl, fileName, caption, textContent } = message;

  // IMAGE — keep the current simple <img> rendering.
  if (messageType === 'IMAGE' && mediaUrl) {
    return (
      <div className="overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={fileName || 'image'}
          className="max-w-full max-h-72 rounded-lg object-cover"
        />
        {caption && (
          <p className="mt-1 px-1 text-sm text-[#121111] whitespace-pre-wrap break-words">
            {caption}
          </p>
        )}
      </div>
    );
  }

  // DOCUMENT — icon + filename + download link.
  if (messageType === 'DOCUMENT' && mediaUrl) {
    return (
      <div className="flex items-center gap-3 max-w-[280px]">
        <div
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' +
            (isOutbound ? 'bg-white/30' : 'bg-[#f5f4f3]')
          }
        >
          <FileText
            className={
              'h-5 w-5 ' + (isOutbound ? 'text-[#121111]' : 'text-[#57534f]')
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#121111]">
            {fileName || 'Document'}
          </p>
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#db0201] hover:underline"
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        </div>
      </div>
    );
  }

  // VIDEO — native player.
  if (messageType === 'VIDEO' && mediaUrl) {
    return (
      <div className="overflow-hidden rounded-lg max-w-full">
        <video
          controls
          preload="metadata"
          src={mediaUrl}
          className="max-w-full max-h-72 rounded-lg"
        />
        {(caption || fileName) && (
          <p className="mt-1 px-1 text-sm text-[#121111] whitespace-pre-wrap break-words">
            {caption || fileName}
          </p>
        )}
      </div>
    );
  }

  // AUDIO — slim audio player.
  if (messageType === 'AUDIO' && mediaUrl) {
    return (
      <div className="min-w-[220px] max-w-[280px]">
        <div className="mb-1 flex items-center gap-2 text-xs text-[#57534f]">
          <Music className="h-3.5 w-3.5" />
          {fileName ? (
            <span className="truncate">{fileName}</span>
          ) : (
            <span>Audio</span>
          )}
        </div>
        <audio
          controls
          preload="metadata"
          src={mediaUrl}
          className="w-full"
        />
      </div>
    );
  }

  // STICKER / unsupported type with a mediaUrl — fall back to filename + link.
  if (mediaUrl) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[#db0201] hover:underline"
      >
        <Film className="h-4 w-4" />
        {fileName || 'Open media'}
      </a>
    );
  }

  // Pure text — should normally be handled by the parent before reaching this,
  // but render it as a last resort.
  if (textContent) {
    return (
      <p className="text-sm text-[#121111] whitespace-pre-wrap break-words">
        {textContent}
      </p>
    );
  }

  return null;
}
