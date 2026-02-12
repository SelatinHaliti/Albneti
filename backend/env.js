/**
 * Ngarkon .env para çdo moduli tjetër.
 * Duhet importuar si rreshti i parë në server.js.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
