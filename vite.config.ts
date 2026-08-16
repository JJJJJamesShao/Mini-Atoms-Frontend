import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 后端地址通过 .env.development 的 API_PROXY_TARGET 注入（不提交仓库），
  // 缺省指向本地后端；联调远端时设为 http://<IP>:<port>
  const env = loadEnv(mode, process.cwd(), 'API_')
  const proxyTarget = env.API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // SSE（POST /api/pipeline）也在 /api 前缀下，同源代理覆盖
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
