/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "replicate.com" },
      { protocol: "https", hostname: "replicate.delivery", pathname: "/**" },
      { protocol: "https", hostname: "pbxt.replicate.delivery", pathname: "/**" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: '20mb' } }, // optional: bigger uploads
};
export default nextConfig;