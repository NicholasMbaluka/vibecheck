/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js']
  },
  images: {
    domains: [process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') || '']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig
