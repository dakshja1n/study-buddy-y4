import withPWA from 'next-pwa'

const nextConfig = withPWA({ dest: 'public', disable: process.env.NODE_ENV === 'development' })({
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
})

export default nextConfig
