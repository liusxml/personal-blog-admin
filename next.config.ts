import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // In Docker, BACKEND_URL is set to http://backend:8080 via environment variable.
    // Falls back to localhost for local development.
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // Actuator 端点代理（仪表盘健康检查 + 指标数据）
        source: '/actuator/:path*',
        destination: `${backendUrl}/actuator/:path*`,
      },
      // 注意：/dozzle/* 由 Route Handler (src/app/dozzle/[[...path]]/route.ts) 代理
      // Route Handler 在请求时执行，可读取运行时 env，不受构建时限制
    ];
  },
};

export default nextConfig;

