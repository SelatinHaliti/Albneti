/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
    ],
  },
  // Lejon useSearchParams() pa Suspense boundary (të gjitha faqet janë client-side)
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // /api/* trajtohet nga app/api/[...path]/route.ts që i dërgon backend-it header-at (Authorization)
};

module.exports = nextConfig;
