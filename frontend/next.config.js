/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
  // /api/* trajtohet nga app/api/[...path]/route.ts që i dërgon backend-it header-at (Authorization)
};

module.exports = nextConfig;
