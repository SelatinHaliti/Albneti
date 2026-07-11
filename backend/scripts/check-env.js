/**
 * Kontrollon variablat kritike para nisjes së serverit.
 */
const required = ['MONGODB_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length) {
  console.error('\n❌ Backend-i nuk mund të niset. Mungojnë në backend/.env:\n');
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error('\nKopjo nga .env.example ose merr MONGODB_URI nga MongoDB Atlas / Render.\n');
  process.exit(1);
}
