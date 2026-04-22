# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install deps
COPY ./Application/package*.json ./
RUN npm ci

# Arguments
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT

# Copy source and build
COPY ./Application .
RUN npm run build

# Runtime stage
FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

ENV PATH=/app/node_modules/.bin:$PATH

CMD ["next", "start", "-p", "3031"]
