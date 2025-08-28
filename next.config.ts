import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "."
  },
  images: {
    domains: ['i.scdn.co']
  }
};

export default nextConfig;
