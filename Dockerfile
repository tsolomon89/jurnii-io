# syntax=docker/dockerfile:1

# Stage 1: Build the static frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json

RUN npm ci

# Copy source files needed for Vite build
COPY vite.config.js index.html manage.html admin-form.html ./
COPY src ./src
COPY content ./content
COPY assets ./assets
COPY brand ./brand
COPY scripts ./scripts
COPY booking ./booking

# Compile content engine manifest and build frontend into dist/
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Install production dependencies only
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json

RUN npm ci --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend runtimes, integrations, and server entrypoints
COPY booking ./booking
COPY integrations ./integrations
COPY server.js worker-runner.js ./

EXPOSE 8080

CMD ["node", "server.js"]
