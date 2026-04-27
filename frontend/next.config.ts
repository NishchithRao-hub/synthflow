// frontend/next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
