// frontend/next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
