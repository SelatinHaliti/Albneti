/** Emër publik. Nuk shfaq email-in, edhe kur username është adresa e postës. */
export function publicHandle(username?: string | null) {
  const raw = (username || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.split('@')[0] || raw;
  return raw;
}
