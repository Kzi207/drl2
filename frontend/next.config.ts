import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Backend Express source is bundled by the Vercel function and has its own tsconfig.
    ignoreBuildErrors: true,
  },
  transpilePackages: ['html5-qrcode'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
