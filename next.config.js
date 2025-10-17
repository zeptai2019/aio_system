/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig