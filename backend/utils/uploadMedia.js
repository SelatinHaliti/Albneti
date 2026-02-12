import crypto from 'crypto';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';

const CLOUDINARY_ERROR_MSG =
  'Cloudinary nuk është konfiguruar. Në backend/.env vendosni vlerat reale: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (merrni nga https://cloudinary.com).';

/**
 * Ngarkon një file (foto/video) në Cloudinary nga buffer
 */
export const uploadToCloudinary = (buffer, folder, resourceType = 'auto') => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error(CLOUDINARY_ERROR_MSG));
  }
  return new Promise((resolve, reject) => {
    const publicId = `${folder}_${crypto.randomBytes(8).toString('hex')}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `albnet/${folder}`,
        resource_type: resourceType,
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          const msg = error?.message || String(error);
          if (msg.includes('api_key') || msg.includes('Must supply')) {
            reject(new Error(CLOUDINARY_ERROR_MSG));
          } else {
            reject(error);
          }
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Fshin një file nga Cloudinary
 */
export const deleteFromCloudinary = (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured) {
    return Promise.resolve({ result: 'ok' });
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
