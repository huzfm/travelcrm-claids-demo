import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
