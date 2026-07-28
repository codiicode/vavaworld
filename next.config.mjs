/** @type {import('next').NextConfig} */
const nextConfig = {
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
