import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruajtje e përkohshme për të ngarkuar në Cloudinary
const storage = multer.memoryStorage();

const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const allowedVideos = ['video/mp4', 'video/quicktime', 'video/webm'];
const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a'];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'music') {
    if (allowedAudio.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Muzika: përdorni MP3, WAV, OGG ose M4A.'), false);
    }
    return;
  }
  if (allowedImages.includes(file.mimetype) || allowedVideos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Lloji i file-it nuk lejohet. Përdorni foto (JPEG, PNG, GIF, WebP) ose video (MP4, WebM).'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB për video
  },
});

export const uploadSingle = upload.single('media');
export const uploadMultiple = upload.array('media', 10);

// Post me media + muzikë opsionale (si Instagram)
export const uploadPostWithMusic = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
}).fields([
  { name: 'media', maxCount: 10 },
  { name: 'music', maxCount: 1 },
]);
