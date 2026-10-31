# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install exactly what pnpm-lock.yaml pins — the lockfile this project is
# developed with — instead of whatever versions are newest on build day.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@10.33.0 && pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs -d /home/nodejs nodejs && \
    mkdir -p /home/nodejs/.npm && \
    chown -R nodejs:nodejs /home/nodejs

COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

RUN chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"
ENV NPM_CONFIG_CACHE=/home/nodejs/.npm

EXPOSE 3010

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:3010/ || exit 1

CMD ["node", "server.js"]