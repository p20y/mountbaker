/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configure for Vercel deployment
  output: 'standalone',
}

module.exports = nextConfig

