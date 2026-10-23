// Single-Option Image Preloading - Optimized for large itineraries

import type { ItineraryDay } from '@/types/index';

const IMAGE_TIMEOUT = 4000; // 4 second timeout per image (reduced from 5s)
const GLOBAL_TIMEOUT = 15000; // 15 second max for all image preloading

// ─── Global image cache ─────────────────────────────────────────────────────
// The same hotel/vehicle/destination image often appears on multiple days.
// Caching avoids redundant network fetches + base64 conversions.
const imageCache = new Map<string, Promise<string | null>>();

type ImageQuality = 'draft' | 'normal' | 'high';
/**
 * `hero` is a full-bleed cover photo (needs real resolution). `thumbnail` is
 * the small side-by-side hotel/vehicle box on a day card — well under 300pt
 * wide in every layout, but it repeats once per day (up to 10-15 times), so
 * it dominates a typical itinerary's total file size. `avatar` is the 34x34pt
 * consultant photo circle on the cover — a couple hundred pixels is already
 * more than it will ever show.
 */
type ImageRole = 'hero' | 'thumbnail' | 'avatar';

// Full-page cover / closing image: an A4 page is ~1650px wide at 200dpi, so
// anything near 800px looks visibly soft once stretched across the page.
const HERO_TRANSFORM: Record<ImageQuality, string> = {
  draft: 'w_1200,c_limit,q_auto:good',
  normal: 'w_1800,c_limit,q_auto:best',
  high: 'w_2480,c_limit,q_auto:best',
};

const THUMBNAIL_TRANSFORM: Record<ImageQuality, string> = {
  draft: 'w_300,c_limit,q_auto:low',
  normal: 'w_450,c_limit,q_auto:eco',
  high: 'w_600,c_limit,q_auto:good',
};

const AVATAR_TRANSFORM = 'w_150,c_limit,q_auto:eco';

// Helper to optimize Cloudinary URLs on the fly by inserting scale and quality transformations
export function getOptimizedCloudinaryUrl(
  url: string,
  quality: ImageQuality = 'normal',
  role: ImageRole = 'hero'
): string {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return url;
  }

  // Insert transformations after /upload/
  if (url.includes('/upload/')) {
    const transformation =
      role === 'avatar'
        ? AVATAR_TRANSFORM
        : role === 'thumbnail'
          ? THUMBNAIL_TRANSFORM[quality]
          : HERO_TRANSFORM[quality];

    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const rest = parts[1];
      // Check if it already has transformations (starts with w_, q_, c_, f_ etc.)
      const hasTransformation =
        /^(c_|w_|h_|q_|f_|e_|r_|o_|l_|p_|g_|x_|y_|z_)/.test(rest) ||
        rest.includes(',c_') ||
        rest.includes(',w_');
      if (!hasTransformation) {
        return `${parts[0]}/upload/${transformation}/${parts[1]}`;
      }
    }
  }
  return url;
}

// Convert URL to base64 with timeout (returns cached promise if available)
function urlToBase64Cached(url: string, timeout = IMAGE_TIMEOUT): Promise<string | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;

  const promise = urlToBase64(url, timeout);
  imageCache.set(url, promise);
  return promise;
}

async function urlToBase64(url: string, timeout = IMAGE_TIMEOUT): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use cache: 'no-cache' to force browser to validate with server
    // so if the image was deleted on Cloudinary, it returns 404 immediately
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  } catch {
    // Return null on failure - react-pdf can still render original URL
    return null;
  }
}

// Preload image — returns undefined if the image is unreachable/deleted
async function preloadImageToBase64(
  url: string | undefined | null,
  skipPreload = false,
  quality: ImageQuality = 'normal',
  role: ImageRole = 'hero'
): Promise<string | undefined> {
  if (!url) return undefined;
  if (skipPreload) return url; // Skip for speed

  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:') || url.startsWith('https://') || url.startsWith('http://')) {
    const optimizedUrl = getOptimizedCloudinaryUrl(url, quality, role);
    // Full-page images are several times larger — give them longer to arrive
    // so a slow connection doesn't drop the cover from the PDF altogether.
    const base64 = await urlToBase64Cached(optimizedUrl, role === 'hero' ? 15000 : IMAGE_TIMEOUT);
    // Return undefined (not the dead URL) when fetch failed — prevents broken image in PDF
    return base64 ?? undefined;
  }
  return url;
}

// Process images in parallel with concurrency limit
async function preloadImagesBatch(
  urls: (string | undefined | null)[],
  skipPreload: boolean,
  quality: ImageQuality = 'normal',
  role: ImageRole = 'hero',
  concurrency = 10,
  onProgress?: (done: number, total: number) => void
): Promise<(string | undefined)[]> {
  const results: (string | undefined)[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => preloadImageToBase64(url, skipPreload, quality, role))
    );
    results.push(...batchResults);
    onProgress?.(Math.min(results.length, urls.length), urls.length);
  }
  return results;
}

// Preload the trip-level cover image (not part of `days`) to a base64 data URL
// so react-pdf can render it without a cross-origin fetch at render time.
export async function preloadCoverImage(
  url: string | undefined | null,
  quality: ImageQuality = 'normal',
  role: ImageRole = 'hero'
): Promise<string | undefined> {
  return preloadImageToBase64(url, quality === 'draft', quality, role);
}

// Preload all images - optimized for large itineraries
export async function preloadAllImages(
  days: ItineraryDay[],
  quality: ImageQuality = 'normal',
  /** Fired after each batch of images finishes, for the download progress UI. */
  onProgress?: (done: number, total: number) => void
): Promise<ItineraryDay[]> {
  // Skip image preloading entirely for draft quality (huge speed improvement)
  if (quality === 'draft') return days;

  const skipPreload = false;

  // Collect ALL unique image URLs (including fallbacks) to avoid duplicate fetches
  const urlSet = new Set<string>();
  days.forEach(day => {
    if (day.hotelImage) urlSet.add(day.hotelImage);
    // Limit to 1 image per day for performance
    if (day.images && day.images.length > 0 && day.images[0]) {
      urlSet.add(day.images[0]);
    }
    // Fallbacks
    if (day.selectedHotelData?.image) urlSet.add(day.selectedHotelData.image);
    if (
      day.selectedHotelData?.images &&
      day.selectedHotelData.images.length > 0 &&
      day.selectedHotelData.images[0]
    ) {
      urlSet.add(day.selectedHotelData.images[0]);
    }
  });

  // Pre-warm the cache by fetching all unique URLs in parallel (with concurrency limit)
  const uniqueUrls = Array.from(urlSet);
  if (uniqueUrls.length === 0) onProgress?.(0, 0);
  if (uniqueUrls.length > 0) {
    // Race between preloading all images and a global timeout
    await Promise.race([
      // Day-level hotel/vehicle photos always render in a small side-by-side
      // box, never full-page, so they use the thumbnail preset regardless of
      // the overall PDF quality tier.
      preloadImagesBatch(uniqueUrls, skipPreload, quality, 'thumbnail', 10, onProgress),
      new Promise<void>(resolve => setTimeout(resolve, GLOBAL_TIMEOUT)),
    ]);
  }

  // Now map the cached results back to days — this is instant since all URLs are cached
  const preloadedDays = await Promise.all(
    days.map(async day => {
      const [hotelImage, dayImage0, fallbackHotelImage, fallbackHotelImage0] = await Promise.all([
        preloadImageToBase64(day.hotelImage, skipPreload, quality, 'thumbnail'),
        day.images?.[0]
          ? preloadImageToBase64(day.images[0], skipPreload, quality, 'thumbnail')
          : undefined,
        day.selectedHotelData?.image
          ? preloadImageToBase64(day.selectedHotelData.image, skipPreload, quality, 'thumbnail')
          : undefined,
        day.selectedHotelData?.images?.[0]
          ? preloadImageToBase64(day.selectedHotelData.images[0], skipPreload, quality, 'thumbnail')
          : undefined,
      ]);

      const images = dayImage0 ? [dayImage0] : day.images?.slice(0, 1) || [];

      const selectedHotelData = day.selectedHotelData
        ? {
            ...day.selectedHotelData,
            image: fallbackHotelImage ?? day.selectedHotelData.image ?? undefined,
            images: day.selectedHotelData.images
              ? ([
                  fallbackHotelImage0 ?? day.selectedHotelData.images[0] ?? undefined,
                  ...day.selectedHotelData.images.slice(1),
                ].filter(Boolean) as string[])
              : [],
          }
        : undefined;

      return {
        ...day,
        images: images.filter(Boolean) as string[],
        // Use preloaded base64 value; undefined means the image was unreachable/deleted — omit it
        hotelImage: hotelImage,
        selectedHotelData,
      };
    })
  );

  return preloadedDays;
}
