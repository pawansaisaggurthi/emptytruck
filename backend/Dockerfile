# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Signal handling + health checks
RUN apk add --no-cache dumb-init curl

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:nodejs src ./src
COPY --chown=appuser:nodejs package.json ./

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

EXPOSE ${PORT:-5000}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
