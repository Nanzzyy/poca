# Next.js standalone production image. Port 3010 (outside 3000-3007 Coolify range).
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Full deps incl devDependencies — build needs tailwindcss/postcss etc.
RUN npm ci || npm install
COPY . .
# NEXT_PUBLIC_* is build-time — pass API URL as build arg from Coolify/env.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
