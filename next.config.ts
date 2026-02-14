import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'web.ua.es',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
