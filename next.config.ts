import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  assetPrefix: "",
  experimental: {
    serverActions: {
      bodySizeLimit: "4.25mb",
    },
  },
};

export default nextConfig;
