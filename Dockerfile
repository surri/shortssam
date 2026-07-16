# Next.js(standalone) → Cloud Run 배포용 멀티스테이지 이미지
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 산출물(server.js + 최소 node_modules) + 정적/public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Cloud Run은 PORT(기본 8080)를 주입, 0.0.0.0 바인딩 필요
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080
CMD ["node", "server.js"]
