import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

const PLACEHOLDERS = [
  '',
  'api_key',
  'api_secret',
  'emri_cloud',
  'emri_juaj_cloud',
  'secreti_juaj_nga_dashboard',
  '123456789012345',
];
const isPlaceholder = (v) => {
  if (!v || typeof v !== 'string') return true;
  const lower = v.toLowerCase().trim();
  if (PLACEHOLDERS.some((p) => lower === p.toLowerCase())) return true;
  if (lower === 'api_key' || lower === 'api_secret') return true;
  return v.length < 5;
};

/** A është Cloudinary i konfiguruar me vlera reale? */
export const isCloudinaryConfigured =
  Boolean(cloudName && apiKey && apiSecret) &&
  !isPlaceholder(cloudName) &&
  !isPlaceholder(apiKey) &&
  !isPlaceholder(apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export default cloudinary;
