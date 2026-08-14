/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['mapbox-gl'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        // Exact hostname, not a wildcard — Tigris is multi-tenant, so
        // *.tigrisfiles.io would let next/image proxy any customer's bucket.
        hostname: 'interrail-tracker-photos.t3.tigrisfiles.io',
      },
    ],
  },
}

export default nextConfig
