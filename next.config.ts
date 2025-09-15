import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

module.exports = {
  output: 'export', // enables static export
  images: { unoptimized: true }, // GitHub Pages doesn’t support Next.js Image Optimization
  basePath: '/<repo>',
  assetPrefix: '/<repo>/',
};