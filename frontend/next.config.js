const { execSync } = require('node:child_process');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

// Stable build ID so identical source = identical hashes across rebuilds.
// Prevents "Failed to find Server Action" errors after redeploys when browsers
// still hold the previous client bundle.
function resolveBuildId() {
  if (process.env.NEXT_BUILD_ID) return process.env.NEXT_BUILD_ID;
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return null; // fall back to Next.js default (random per build)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => resolveBuildId(),
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
