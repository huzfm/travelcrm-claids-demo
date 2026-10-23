'use client';

import { useRef, useState, type DragEvent, type HTMLAttributes, type ReactNode } from 'react';
import { Paperclip } from 'lucide-react';

interface UseDragDropOverlayOptions {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

interface UseDragDropOverlayResult {
  containerProps: HTMLAttributes<HTMLDivElement>;
  overlay: ReactNode;
}

/**
 * Hook that returns spread-on-container drag handlers and an overlay element
 * to render inside the same container. Uses a counter ref so the overlay
 * doesn't flicker when the cursor crosses child elements inside the panel.
 */
export function useDragDropOverlay({
  disabled,
  onFiles,
}: UseDragDropOverlayOptions): UseDragDropOverlayResult {
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

  const containerProps: HTMLAttributes<HTMLDivElement> = {
    onDragEnter: (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      counter.current += 1;
      if (counter.current === 1) setDragging(true);
    },
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      // Keep counter positive so child dragovers don't toggle the overlay.
      if (counter.current <= 0) counter.current = 1;
    },
    onDragLeave: (e: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      counter.current = 0;
      setDragging(false);
      if (disabled) return;
      const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (files.length > 0) onFiles(files);
    },
  };

  const overlay: ReactNode = dragging ? (
    <div
      className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 rounded-md border-4 border-dashed border-[#db0201] bg-[#db0201]/15"
    >
      <Paperclip className="h-10 w-10 text-[#db0201]" />
      <p className="text-base font-medium text-[#121111]">Drop files to send</p>
    </div>
  ) : null;

  return { containerProps, overlay };
}
