/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy all /api/* calls to the FastAPI backend during local dev.
    // The browser sees same-origin requests so no CORS preflight is triggered.
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
