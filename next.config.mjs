/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The preview proxy serves this app from a host we do not control.
  allowedDevOrigins: ['*', '*.e2b.app', '*.arena.ai'],
};

export default nextConfig;
