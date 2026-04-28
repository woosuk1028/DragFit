import { execSync } from 'node:child_process';
import withSerwistInit from '@serwist/next';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

// Stable build ID so identical source = identical hashes across rebuilds.
function resolveBuildId() {
  if (process.env.NEXT_BUILD_ID) return process.env.NEXT_BUILD_ID;
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return null;
  }
}

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

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

export default withSerwist(nextConfig);
