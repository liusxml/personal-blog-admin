import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // In Docker, BACKEND_URL is set to http://backend:8080 via environment variable.
    // Falls back to localhost for local development.
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
    // In Docker, DOZZLE_URL is set to http://dozzle:8080 via environment variable.
    const dozzleUrl = process.env.DOZZLE_URL ?? 'http://localhost:8888';
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
      {
        // Dozzle 容器日志代理（由 Middleware 验证 JWT 并注入 Remote-User Header）
        // DOZZLE_BASE=/dozzle 确保 Dozzle 所有资源路径也加上 /dozzle 前缀
        source: '/dozzle/:path*',
        destination: `${dozzleUrl}/dozzle/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // 禁用 Dozzle 路由的响应缓冲，保证 SSE 实时日志流能正常透传
        source: '/dozzle/:path*',
        headers: [{ key: 'X-Accel-Buffering', value: 'no' }],
      },
    ];
  },
};

export default nextConfig;

