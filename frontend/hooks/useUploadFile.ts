'use client';

import { useCallback, useState } from 'react';

export type UploadKind = 'image' | 'document' | 'video' | 'audio';

export interface StagedFile {
  file: File;
  dataUrl: string; // base64 data URL — sent straight to backend in the WhatsApp message body
  mediaType: UploadKind;
  fileName: string;
  mimeType: string;
  size: number;
}

// 25 MB — matches the user-facing cap from the original plan.
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIMES = new Set<string>([
  // images
  'image/jpeg',
  'image/png',
  'image/webp',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  // videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // audio
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/mp4',
]);

function inferKind(mimeType: string): UploadKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export class LocalFileError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LocalFileError';
    this.status = status;
  }
}

interface UseUploadFileOptions {
  onSuccess?: (staged: StagedFile) => void;
  onError?: (error: Error) => void;
}

interface UseUploadFileResult {
  /**
   * Synchronously-ish "stages" a file: validates it and converts to a base64
   * data URL. NO network call. The dataUrl is held in memory only and
   * forwarded to the backend when the user sends the message.
   */
  stageFileAsync: (file: File) => Promise<StagedFile>;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Local-only file staging. No Cloudinary / no server storage. The base64
 * dataUrl travels with the chat send request and is forwarded by the backend
 * to Evolution API as a media payload.
 */
export function useUploadFile(options: UseUploadFileOptions = {}): UseUploadFileResult {
  const { onSuccess, onError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stageFileAsync = useCallback(
    async (file: File): Promise<StagedFile> => {
      setError(null);
      setIsUploading(true);
      try {
        if (!ALLOWED_MIMES.has(file.type)) {
          throw new LocalFileError(
            `File type not allowed: ${file.type || 'unknown'}. Allowed: images, pdf, doc, xls, ppt, txt, mp4, mov, webm, mp3, ogg, wav.`
          );
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          throw new LocalFileError('File too large. Maximum size is 25 MB.', 413);
        }
        const dataUrl = await readAsDataUrl(file);
        const staged: StagedFile = {
          file,
          dataUrl,
          mediaType: inferKind(file.type),
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        };
        onSuccess?.(staged);
        return staged;
      } catch (err: any) {
        const e: Error =
          err instanceof Error ? err : new LocalFileError(err?.message || 'Failed to read file');
        setError(e);
        onError?.(e);
        throw e;
      } finally {
        setIsUploading(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    stageFileAsync,
    isUploading,
    error,
    reset: () => setError(null),
  };
}
