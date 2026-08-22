/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // The hero concept page was promoted to the landing page.
    return [{ source: '/hero-test', destination: '/', permanent: false }];
  },
  images: {
    // AVIF first (smallest), WebP fallback. Next.js will negotiate via Accept
    // header so legacy browsers still get JPEG.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 750],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
