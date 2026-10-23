'use client';

import { createElement } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FilePieChart,
  Film,
  Music,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadKind } from '@/hooks/useUploadFile';

interface AttachmentPreviewProps {
  fileName: string;
  mimeType: string;
  size: number;
  kind: UploadKind;
  uploading: boolean;
  /** Base64 data URL of the staged file. Used as a thumbnail for images. */
  dataUrl?: string;
  onRemove: () => void;
}

function pickIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return FileText;
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return FileSpreadsheet;
  }
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return FilePieChart;
  }
  return FileText;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  return createElement(pickIcon(mimeType), { className });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Chip rendered above the chat composer when a file is staged.
 * Shows image thumbnail (via object URL) for images, otherwise a mime-aware icon,
 * plus the filename, size, optional upload spinner and a remove button.
 */
export function AttachmentPreview({
  fileName,
  mimeType,
  size,
  kind,
  uploading,
  dataUrl,
  onRemove,
}: AttachmentPreviewProps) {
  const isImage = kind === 'image';
  // We don't need a useEffect/object-URL dance — the parent passes a base64
  // dataUrl that we can render directly with <img src={dataUrl}>.

  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-[#d6d3d1] bg-white p-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f4f3]">
        {isImage && dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={fileName}
            className={cn(
              'h-full w-full object-cover transition-opacity',
              uploading && 'opacity-40'
            )}
          />
        ) : (
          <FileIcon
            mimeType={mimeType}
            className={cn('h-6 w-6 text-[#57534f] transition-opacity', uploading && 'opacity-40')}
          />
        )}
        {uploading && <Loader2 className="absolute h-5 w-5 animate-spin text-[#db0201]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#121111]">{fileName}</p>
        </div>
        <p className="text-xs text-[#78736F]">{uploading ? 'Reading file…' : formatSize(size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#57534f]',
          'hover:bg-[#f5f4f3] hover:text-[#121111]'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
