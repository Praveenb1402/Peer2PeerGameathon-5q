/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  // ❌ Do not use `output: 'export'` or `basePath` on Vercel
};

export default nextConfig;