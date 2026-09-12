# Next.js standalone production image. Port 3010 (outside 3000-3007 Coolify range).
# Cache-bust: 2026-08-04T16:50 deploy
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Full deps incl devDependencies — build needs tailwindcss/postcss etc.
RUN npm ci || npm install
COPY . .
# Browser requests use the same-origin Next.js proxy by default. Set
# NEXT_PUBLIC_API_URL only when deliberately calling a public API directly.
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Internal backend address used by the Next.js proxy.
ARG API_PROXY_TARGET=http://backend:8008
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME=0.0.0.0
# Non-root user for safety.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3010
CMD ["node", "server.js"]
