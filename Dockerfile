# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY backend/package.json ./
RUN npm install && npm cache clean --force

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init curl

COPY --from=deps /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

EXPOSE ${PORT:-5000}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
