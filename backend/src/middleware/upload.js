import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads');

const ensureDirectories = () => {
  const dirs = [
    path.join(uploadsDir, 'itineraries'),
    path.join(uploadsDir, 'leads'),
    path.join(uploadsDir, 'whatsapp'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'leads';

    if (req.baseUrl.includes('itineraries')) {
      folder = 'itineraries';
    } else if (req.baseUrl.includes('whatsapp')) {
      folder = 'whatsapp';
    }

    const dest = path.join(uploadsDir, folder);

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp4',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const uploadItineraries = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(uploadsDir, 'itineraries');
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const uploadWhatsapp = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(uploadsDir, 'whatsapp');
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const uploadLeads = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(uploadsDir, 'leads');
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.csv', '.xls', '.xlsx'];
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed for leads import'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
