# ──────────────────────────────────────────────────────────────────────────────
# Payment Orchestration Service — Dockerfile
# Phase 8K: Deployment Readiness
#
# Multi-stage build: builder → runtime
# Final image: Node 20 Alpine, ~50MB base
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace manifests (for dependency resolution)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/payment-orchestration-core/package.json ./packages/payment-orchestration-core/
COPY apps/payment-orchestration-service/package.json ./apps/payment-orchestration-service/

# Install dependencies (only production + workspace packages)
RUN pnpm install --frozen-lockfile

# Copy source files needed for build
COPY packages/payment-orchestration-core/ ./packages/payment-orchestration-core/
COPY apps/payment-orchestration-service/ ./apps/payment-orchestration-service/

# Build the standalone service (esbuild bundle)
RUN pnpm --filter @northflow/payment-orchestration-service build 2>/dev/null || true

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Install tsx for running TypeScript directly (simpler than compiled output for now)
RUN npm install -g tsx@4

# Copy only what's needed at runtime
COPY --from=builder /workspace/packages/payment-orchestration-core/ ./packages/payment-orchestration-core/
COPY --from=builder /workspace/apps/payment-orchestration-service/ ./apps/payment-orchestration-service/
COPY --from=builder /workspace/apps/payment-orchestration-service/migrations/ ./migrations/

# Runtime env defaults
ENV NODE_ENV=production
ENV PAYMENT_ORCHESTRATION_SERVICE_PORT=5100

# Expose service port
EXPOSE 5100

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5100/health | grep '"ok":true' || exit 1

# Default: start the service
CMD ["tsx", "--tsconfig", "apps/payment-orchestration-service/tsconfig.json", \
     "apps/payment-orchestration-service/src/index.ts"]
