'use client';
import { pdf, Font } from '@react-pdf/renderer';
import api from '@/lib/axios';
import type { Itinerary } from '@/types/index';
import { buildConfirmationData } from './data';
import {
  ConfirmationPDFDocument,
  CONFIRMATION_FONT,
  type ConfirmationLogo,
} from './ConfirmationPDF';

const LOGO_URL = '/white1.png';

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const base = `${window.location.origin}/fonts/Montserrat`;
  Font.register({
    family: CONFIRMATION_FONT,
    fonts: [
      { src: `${base}-Regular.ttf`, fontWeight: 400 },
      { src: `${base}-Medium.ttf`, fontWeight: 500 },
      { src: `${base}-SemiBold.ttf`, fontWeight: 600 },
      { src: `${base}-Bold.ttf`, fontWeight: 700 },
      { src: `${base}-ExtraBold.ttf`, fontWeight: 800 },
    ],
  });
  fontsRegistered = true;
}

/**
 * The logo file is a square with a lot of transparent padding around the
 * wordmark. Trim it to the drawn pixels so the PDF can size it by the
 * wordmark itself. Returns null if the file can't be read — the PDF then
 * prints a text mark instead.
 */
async function loadTrimmedLogo(): Promise<ConfirmationLogo | null> {
  try {
    const img = new window.Image();
    img.src = LOGO_URL;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const visible = data[i + 3] > 16;
        const nearWhite = data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240;
        if (visible && !nearWhite) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;

    const pad = 2;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(width, maxX + pad + 1) - sx;
    const sh = Math.min(height, maxY + pad + 1) - sy;

    // Draw at 3× so the wordmark stays sharp when the PDF is zoomed.
    const scale = 3;
    const out = document.createElement('canvas');
    out.width = sw * scale;
    out.height = sh * scale;
    const outCtx = out.getContext('2d');
    if (!outCtx) return null;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);

    return { src: out.toDataURL('image/png'), width: sw, height: sh };
  } catch {
    return null;
  }
}

const safeFileName = (name: string) =>
  name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

/** Builds the booking confirmation from a saved itinerary and downloads it. */
export async function downloadConfirmationPDF(itineraryId: string): Promise<void> {
  registerFonts();

  const [itinerary, logo] = await Promise.all([
    api
      .get<{ success: boolean; data: { itinerary: Itinerary } }>(`/itineraries/${itineraryId}`)
      .then(res => res.data.data.itinerary),
    loadTrimmedLogo(),
  ]);

  const data = buildConfirmationData(itinerary);
  const blob = await pdf(ConfirmationPDFDocument({ data, logo })).toBlob();

  const clientName = itinerary.clientName || itinerary.lead?.name || 'Client';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(clientName)} - Booking Confirmation.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
