/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent webpack from bundling native binaries — they must be loaded from
  // node_modules at runtime so their paths resolve correctly on Vercel Lambda
  serverExternalPackages: ['ffmpeg-static'],
}

module.exports = nextConfig
