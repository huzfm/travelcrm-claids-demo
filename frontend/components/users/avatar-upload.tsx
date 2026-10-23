'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Matches the multer limit on POST /uploads/avatar, so an oversized file is
// rejected here instead of after a pointless round trip.
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface AvatarUploadProps {
  /** Current photo URL, or null when the user has none. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Used for the initials shown until a photo is picked. */
  name?: string;
  disabled?: boolean;
  className?: string;
}

function initialsOf(name?: string) {
  if (!name?.trim()) return null;
  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Circular profile-photo picker. Uploads straight to Cloudinary via the backend
 * and hands the resulting URL back — the caller stores it with the rest of the
 * form, so cancelling the form simply leaves an unused image behind rather than
 * changing the account.
 */
export function AvatarUpload({
  value,
  onChange,
  name,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const initials = initialsOf(name);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear immediately so picking the same file twice in a row still fires.
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Photo must be a JPG, PNG or WebP image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Photo must be smaller than 5 MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{ success: boolean; data?: { url?: string } }>(
        '/uploads/avatar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const url = response.data?.data?.url;
      if (!url) throw new Error('No URL returned');

      onChange(url);
      toast.success('Photo uploaded');
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
      toast.error(message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        aria-label={value ? 'Change profile photo' : 'Upload profile photo'}
        className={cn(
          'group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        )}
      >
        {value ? (
          <Image src={value} alt="" fill sizes="80px" className="object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {initials ?? <UserRound className="h-7 w-7" />}
          </span>
        )}

        {!disabled && (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/50 text-white',
              'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
              isUploading && 'opacity-100'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </span>
        )}
      </button>

      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
          </Button>
          {value && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={isUploading}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Up to 5 MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
