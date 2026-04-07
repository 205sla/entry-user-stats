/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "playentry.org" },
    ],
  },
}

export default nextConfig
