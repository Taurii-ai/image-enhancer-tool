/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "replicate.com" },
      { protocol: "https", hostname: "replicate.delivery" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: '20mb' } }, // optional: bigger uploads
};
export default nextConfig;