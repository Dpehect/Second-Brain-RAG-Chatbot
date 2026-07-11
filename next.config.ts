import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16 default compiler)
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./src/lib/shim.ts",
      "sharp": "./src/lib/shim.ts",
    },
  },
  // Webpack fallback configuration
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
