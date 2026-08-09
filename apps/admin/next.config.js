/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hmray/types", "@hmray/config"],
};

module.exports = nextConfig;
