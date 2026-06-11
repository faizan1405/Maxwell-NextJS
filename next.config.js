/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/shop',            destination: '/' },
      { source: '/cart',            destination: '/' },
      { source: '/checkout',        destination: '/' },
      { source: '/account',         destination: '/' },
      { source: '/faq',             destination: '/' },
      { source: '/order-confirmed', destination: '/' },
    ];
  },
};

module.exports = nextConfig;
