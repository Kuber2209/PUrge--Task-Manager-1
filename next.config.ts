import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
       {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      }
    ],
  },
   async rewrites() {
    return [
      {
        source: '/__/firebase/init.json',
        destination: '/api/firebase-config',
      },
    ];
  },
};

export default nextConfig;
