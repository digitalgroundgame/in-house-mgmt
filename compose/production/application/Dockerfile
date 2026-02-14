# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install deps
COPY ./Application/package*.json ./
RUN npm ci

# Arguments
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

# Copy source and build
COPY ./Application .
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

ENV PATH=/app/node_modules/.bin:$PATH

CMD ["npm", "run", "start"]
