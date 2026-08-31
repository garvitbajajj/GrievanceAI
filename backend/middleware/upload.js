import multer from 'multer';
import path from 'path';

// ─── Disk Storage Configuration ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Prevent filename collisions with timestamp prefix
    cb(null, Date.now() + '_' + file.originalname);
  }
});

// ─── Allowed MIME Types ─────────────────────────────────────────
const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const AUDIO_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'audio/webm'
];

// ─── File Filter Factories ──────────────────────────────────────
const imageFilter = (req, file, cb) => {
  if (IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const audioFilter = (req, file, cb) => {
  if (AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

// ─── Multer Instances ───────────────────────────────────────────
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB, aligned with Render-safe AI limits

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_SIZE }
}).single('image');

export const uploadAudio = multer({
  storage,
  fileFilter: audioFilter,
  limits: { fileSize: MAX_SIZE }
}).single('audio');

export const uploadCombined = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype) || AUDIO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});
