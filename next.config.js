/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "replicate.com" },
      // Public Vercel Blob host (adjust if your store is named differently)
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  reactStrictMode: true,
};
export default nextConfig;