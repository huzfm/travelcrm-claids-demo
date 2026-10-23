'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Paperclip, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadKind } from '@/hooks/useUploadFile';

interface AttachmentMenuProps {
  disabled?: boolean;
  onPick: (file: File, kind: UploadKind) => void;
}

const MENU_ITEM_CLASS =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-[#121111] hover:bg-[#f5f4f3] transition-colors';

/**
 * WhatsApp-Web-style paperclip button.
 * Clicking opens a popover with two options:
 *   - Photo & Video  (image/*, video/*)
 *   - Document       (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt)
 * Each option triggers a hidden file input.
 */
export function AttachmentMenu({ disabled, onPick }: AttachmentMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind: UploadKind = file.type.startsWith('video/') ? 'video' : 'image';
    onPick(file, kind);
    e.target.value = '';
    setOpen(false);
  };

  const handleDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPick(file, 'document');
    e.target.value = '';
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Attach file"
          className="text-[#57534f] hover:bg-[#e8e6e4] rounded-full h-10 w-10"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-56 p-1 bg-white border border-[#d6d3d1] shadow-lg"
      >
        <label className={cn(MENU_ITEM_CLASS, disabled && 'pointer-events-none opacity-50')}>
          <ImageIcon className="h-5 w-5 text-[#db0201]" />
          <span>Photo &amp; Video</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleImageChange}
            disabled={disabled}
          />
        </label>
        <label className={cn(MENU_ITEM_CLASS, disabled && 'pointer-events-none opacity-50')}>
          <FileText className="h-5 w-5 text-[#db0201]" />
          <span>Document</span>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={handleDocChange}
            disabled={disabled}
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
