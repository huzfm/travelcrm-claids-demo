# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS deps

WORKDIR /app

# Install OpenSSL 1.1 (required by Prisma query engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install exactly what package-lock.json pins (npm ci fails instead of
# silently resolving newer versions if the lockfile is out of date)
RUN npm ci

# ============================================
# Stage 2: Build (Prisma generate)
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL 1.1 (required by Prisma query engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client for linux-x64-openssl-1.1.x
RUN npx prisma generate

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL 1.1 and other runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with home directory and cache directory
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs -d /home/nodejs nodejs && \
    mkdir -p /home/nodejs/.npm /home/nodejs/.cache && \
    chown -R nodejs:nodejs /home/nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    chown -R nodejs:nodejs /app/node_modules

# Copy prisma schema (needed for runtime)
COPY prisma ./prisma

# Copy generated Prisma client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy application source
COPY --chown=nodejs:nodejs src ./src

# Create uploads directory with proper ownership
RUN mkdir -p /app/uploads/itineraries /app/uploads/leads /app/uploads/whatsapp && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Set npm cache to user home directory
ENV NPM_CONFIG_CACHE=/home/nodejs/.npm
ENV COREPACK_CACHE=/home/nodejs/.cache

# Default port
ENV PORT=5000

# Expose port (matching the server's PORT env or default 5000)
EXPOSE 5000

# Health check - using wget with better error handling
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:5000/api/v1/health 2>/dev/null || exit 1

# Set working directory for uploads
ENV NODE_ENV=production

# Start application
CMD ["node", "src/index.js"]
