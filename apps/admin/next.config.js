const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep classic `next start` in Docker (more reliable with pnpm than broken standalone symlinks on some hosts)
  reactStrictMode: true,
  transpilePackages: ["@hmray/types", "@hmray/config"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

module.exports = nextConfig;
