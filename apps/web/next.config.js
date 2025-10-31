/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pos/core', '@pos/features'],
}

module.exports = nextConfig
