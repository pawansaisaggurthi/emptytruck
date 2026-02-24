# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_RAZORPAY_KEY
ARG VITE_GOOGLE_MAPS_KEY
ARG VITE_APP_VERSION

ENV VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_RAZORPAY_KEY=$VITE_RAZORPAY_KEY \
    VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ─── Stage 2: Nginx ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
