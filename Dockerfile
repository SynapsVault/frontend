# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build arguments for environment configuration
ARG VITE_API_URL=/api
ARG VITE_NETWORK=testnet
ARG VITE_SENTRY_DSN=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NETWORK=$VITE_NETWORK
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Fail fast: a production image must be built against a real backend URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" >&2 && exit 1)

# Type check and build
RUN npm run typecheck
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --start-interval=2s \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

# Runs as the unprivileged nginx user (UID 101) on 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]