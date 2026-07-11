import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AlbNet – Rrjeti Social Shqiptar',
    short_name: 'AlbNet',
    description: 'Platforma sociale shqiptare – postime, story, reels, chat global dhe diaspora.',
    start_url: '/feed',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#e41e26',
    orientation: 'portrait-primary',
    lang: 'sq',
    categories: ['social', 'entertainment'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'Kryefaja', url: '/feed' },
      { name: 'Reels', url: '/reels' },
      { name: 'Chat Global', url: '/chat-global' },
      { name: 'Mesazhe', url: '/mesazhe' },
    ],
  };
}
