import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/demo",
        destination: "/",
        permanent: true,
      },
      {
        source: "/demo-detect",
        destination: "/?mode=detect",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
