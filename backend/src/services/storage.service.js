/**
 * Local File Storage Service
 *
 * All files are stored on the local server disk under /uploads/
 * This is the default and only storage mode for Phase 1.
 *
 * Directory structure:
 * /uploads/
 *   /itineraries/  - Generated PDF itineraries
 *   /leads/         - CSV imports, lead attachments
 *   /whatsapp/      - Downloaded WhatsApp media
 *
 * For future cloud storage (Phase 2+):
 * Add STORAGE_PROVIDER, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY
 * to .env and implement S3-compatible storage.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get uploads directory path
 */
export const getUploadsDir = () => {
  return path.join(process.cwd(), 'uploads');
};

/**
 * Generate a unique file key for storage
 * @param {string} folder - Subfolder (e.g., 'itineraries', 'leads', 'whatsapp')
 * @param {string} originalFilename - Original filename
 * @param {string} customId - Optional custom ID to use
 */
export const generateFileKey = (folder, originalFilename, customId = null) => {
  const ext = path.extname(originalFilename || '').toLowerCase();
  const id = customId || uuidv4();
  const safeExt = ext.length > 1 ? ext : '.bin';
  return `${folder}/${id}${safeExt}`;
};

/**
 * Ensure directory exists
 */
const ensureDir = key => {
  const uploadsDir = getUploadsDir();
  const localPath = path.join(uploadsDir, key);
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return localPath;
};

/**
 * Save an uploaded file (main integration point for multer)
 * @param {string} folder - The uploads subfolder
 * @param {File} file - Multer file object
 * @param {string} customId - Optional custom ID for the filename
 */
export const saveUploadedFile = (folder, file, customId = null) => {
  const originalFilename = file.originalname || file.filename || 'file';
  const key = generateFileKey(folder, originalFilename, customId);
  const localPath = ensureDir(key);

  // If file is already on disk (multer diskStorage)
  if (file.path) {
    fs.copyFileSync(file.path, localPath);
    try {
      fs.unlinkSync(file.path); // Cleanup temp file
    } catch {
      // Ignore cleanup errors
    }
    return {
      success: true,
      key,
      path: localPath,
      url: `/uploads/${key}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  // If file is in buffer (multer memoryStorage)
  if (file.buffer) {
    fs.writeFileSync(localPath, file.buffer);
    return {
      success: true,
      key,
      path: localPath,
      url: `/uploads/${key}`,
      size: file.buffer.length,
      mimetype: file.mimetype,
    };
  }

  throw new Error('No file data available');
};

/**
 * Delete a local file by its relative path
 */
export const deleteFile = relativePath => {
  const uploadsDir = getUploadsDir();
  const localPath = path.join(uploadsDir, relativePath);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    return true;
  }
  return false;
};

/**
 * Delete a local file by its storage key
 */
export const deleteFileByKey = key => {
  return deleteFile(key);
};

/**
 * Get the local path for a storage key
 */
export const getLocalPath = key => {
  return path.join(getUploadsDir(), key);
};

/**
 * Check if a file exists locally
 */
export const fileExists = key => {
  const localPath = getLocalPath(key);
  return fs.existsSync(localPath);
};

/**
 * Read a file from local storage
 */
export const readFile = key => {
  const localPath = getLocalPath(key);
  return fs.readFileSync(localPath);
};

/**
 * Get file info (size, modified date)
 */
export const getFileInfo = key => {
  const localPath = getLocalPath(key);
  if (!fs.existsSync(localPath)) {
    return null;
  }
  const stats = fs.statSync(localPath);
  return {
    key,
    path: localPath,
    url: `/uploads/${key}`,
    size: stats.size,
    modifiedAt: stats.mtime,
  };
};

/**
 * Storage info (for API responses)
 */
export const getStorageInfo = () => {
  return {
    provider: 'local',
    isConfigured: true,
    uploadsDir: getUploadsDir(),
  };
};
