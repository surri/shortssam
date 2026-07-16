import type { NextConfig } from "next"
import path from "node:path"

// Cloud Run 배포용 standalone 출력. 트레이싱/turbopack 루트를 web/로 고정
// (상위 hackathon/ 의 .venv 등이 딸려 들어가지 않도록).
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd()),
  turbopack: { root: path.join(process.cwd()) },
}

export default nextConfig
