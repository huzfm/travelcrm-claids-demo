'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/axios';

// Matches the multer hard cap on POST /uploads/image — files over this are
// rejected outright, so this is checked client-side before the upload starts.
export const MAX_UPLOAD_IMAGE_BYTES = 500 * 1024;

/**
 * Uploads a single image through the generic /uploads/image endpoint. `type`
 * is passed through to the backend, which uses it only to pick a Cloudinary
 * folder — anything other than 'hotel' lands in travel-crm/itinerary-days.
 */
export function useImageUpload(type: string) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string | null> => {
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      toast.error(
        `That photo is ${Math.ceil(file.size / 1024)} KB — the maximum is ${MAX_UPLOAD_IMAGE_BYTES / 1024} KB.`
      );
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (res.data?.success && url) return url;
      toast.error(res.data?.error || 'Failed to upload image');
      return null;
    } catch {
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, upload };
}
