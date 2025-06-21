/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/Peer2PeerGameathon-5q' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Peer2PeerGameathon-5q/' : '',
  output: 'export',
  trailingSlash: true, // <-- IMPORTANT
};

export default nextConfig;
