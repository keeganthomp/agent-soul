import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@noble/hashes",
    "@solana/web3.js",
    "sharp",
    "@metaplex-foundation/umi",
    "@metaplex-foundation/umi-bundle-defaults",
    "@metaplex-foundation/mpl-core",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "*.replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
