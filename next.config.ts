import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverRuntimeConfig: {
    TRANSFER_AI_URL: process.env.TRANSFER_AI_URL,
  },
};

export default nextConfig;
