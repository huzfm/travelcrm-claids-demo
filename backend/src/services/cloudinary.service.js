import { v2 as cloudinary } from 'cloudinary';
import stream from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_FOLDER = 'travel-crm';


/**
 * Upload an image buffer to Cloudinary with optimization
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Subfolder in Cloudinary
 * @param {object} options - Additional Cloudinary options
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadToCloudinary(buffer, folder = CLOUDINARY_FOLDER, options = {}) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
          { width: 1200, height: 1200, crop: 'limit' },
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    const readableStream = new stream.PassThrough();
    readableStream.end(buffer);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Upload a base64 image string to Cloudinary
 * @param {string} base64String - Base64 encoded image (data:image/...;base64,...)
 * @param {string} folder - Subfolder in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadBase64ToCloudinary(base64String, folder = CLOUDINARY_FOLDER) {
  return cloudinary.uploader
    .upload(base64String, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' },
      ],
    })
    .then(result => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));
}

/**
 * Delete an image from Cloudinary
 * Throws on failure so callers can surface a real error to the user — silent
 * failures here used to leave dangling images in the PDF after removal.
 * @param {string} publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    // Cloudinary returns { result: 'ok' } on success, { result: 'not found' } if
    // the asset is already gone. Treat "not found" as a non-error (idempotent).
    if (result?.result && result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary destroy returned: ${result.result}`);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Delete multiple images from Cloudinary
 * Throws on failure. Cloudinary's bulk API returns a `deleted` map; partial
 * failures (`result.partial: true` or any non-`ok` value) are also thrown.
 * @param {string[]} publicIds - Array of Cloudinary public IDs
 */
export async function deleteMultipleFromCloudinary(publicIds) {
  if (!publicIds || publicIds.length === 0) return;

  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    if (result?.partial) {
      const failed = Object.entries(result.deleted || {})
        .filter(([, status]) => status !== 'ok' && status !== 'not found')
        .map(([id]) => id);
      if (failed.length > 0) {
        throw new Error(`Cloudinary bulk delete failed for: ${failed.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw error;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string|null}
 */
export function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
    return null;
  }

  const regex = /\/upload\/v\d+\/(.+)\.\w+/;
  const match = cloudinaryUrl.match(regex);
  return match ? match[1] : null;
}

/**
 * Compress and optimize an image buffer
 * Uses sharp-like transformation via Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Quality (1-100), auto-recommended
 * @returns {Promise<{buffer: Buffer, width: number, height: number}>}
 */
export async function optimizeImageLocally(
  buffer,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 80
) {
  // For server-side optimization, we recommend using sharp package
  // This is a placeholder that returns the original buffer
  // In production, install and use sharp for better performance

  // If sharp is available, use it
  try {
    const sharp = (await import('sharp')).default;
    const optimized = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    const metadata = await sharp(buffer).metadata();

    return {
      buffer: optimized,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    // Sharp not available, return original
    return { buffer, width: null, height: null };
  }
}

/**
 * Upload a PDF buffer to Cloudinary
 * @param {Buffer} buffer - PDF buffer
 * @param {string} folder - Subfolder in Cloudinary
 * @param {string} filename - Filename for the PDF
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadPDFToCloudinary(
  buffer,
  folder = CLOUDINARY_FOLDER,
  filename = 'document.pdf'
) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        public_id: filename.replace(/\.pdf$/i, ''),
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary PDF upload error:', error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    const readableStream = new stream.PassThrough();
    readableStream.end(buffer);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Upload a file with local optimization first, then Cloudinary
 * @param {File|Buffer} file - File object or buffer
 * @param {string} folder - Cloudinary folder
 * @param {object} options - Additional options
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadOptimizedImage(file, folder = CLOUDINARY_FOLDER, options = {}) {
  let buffer;

  if (file.buffer) {
    // Multer file object
    buffer = file.buffer;
  } else if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    throw new Error('Invalid file input');
  }

  // Optimize locally first if sharp is available
  try {
    const { buffer: optimizedBuffer } = await optimizeImageLocally(buffer);
    return uploadToCloudinary(optimizedBuffer, folder, options);
  } catch {
    // Fall back to direct upload
    return uploadToCloudinary(buffer, folder, options);
  }
}

/**
 * Upload any media type (image / video / audio / document) to Cloudinary.
 * Picks resource_type from the mime type so Evolution API can consume the URL.
 * - image/*  -> 'image' (with auto-quality transforms)
 * - video/*  -> 'video'
 * - audio/*  -> 'raw' (more reliable delivery than 'video' for audio)
 * - application/* (pdf, msword, openxml, excel, powerpoint, text) -> 'raw'
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Cloudinary folder
 * @param {string} mimeType - Source mime type
 * @param {string} fileName - Original filename (sanitized, used for raw public_id)
 * @returns {Promise<{url: string, publicId: string, resourceType: string}>}
 */
export async function uploadAnyToCloudinary(
  buffer,
  folder = CLOUDINARY_FOLDER,
  mimeType = '',
  fileName = 'file'
) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file');
  }

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  // Sanitize filename: strip any path separators, restrict to safe chars.
  const safeBaseName = String(fileName)
    .replace(/^.*[\\/]/, '')            // strip any path
    .replace(/\s+/g, '_')               // collapse whitespace
    .replace(/[^A-Za-z0-9._-]/g, '')    // allowlist safe chars
    .slice(0, 100) || 'file';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let resourceType;
  let cloudinaryOptions;

  if (isImage) {
    resourceType = 'image';
    cloudinaryOptions = {
      folder,
      resource_type: 'image',
      public_id: `${unique}-${safeBaseName.replace(/\.[^.]+$/, '')}`,
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' },
        { width: 1600, height: 1600, crop: 'limit' },
      ],
    };
  } else if (isVideo) {
    resourceType = 'video';
    cloudinaryOptions = {
      folder,
      resource_type: 'video',
      public_id: `${unique}-${safeBaseName.replace(/\.[^.]+$/, '')}`,
    };
  } else {
    // audio, application/* docs, text/* -> raw. Preserve the original extension
    // so Cloudinary serves the file with a usable Content-Type / filename.
    resourceType = 'raw';
    const ext = (safeBaseName.match(/\.[^.]+$/) || [''])[0];
    cloudinaryOptions = {
      folder,
      resource_type: 'raw',
      public_id: `${unique}-${safeBaseName.replace(/\.[^.]+$/, '')}${ext}`,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      cloudinaryOptions,
      (error, result) => {
        if (error) {
          console.error(`[uploadAnyToCloudinary] error (${resourceType}):`, error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType,
        });
      }
    );

    const readableStream = new stream.PassThrough();
    readableStream.end(buffer);
    readableStream.pipe(uploadStream);
  });
}

export default {
  uploadToCloudinary,
  uploadBase64ToCloudinary,
  uploadPDFToCloudinary,
  uploadAnyToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  extractPublicId,
  optimizeImageLocally,
  uploadOptimizedImage,
};
