# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install deps
COPY ./Application/package*.json ./
RUN npm ci

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
COPY --from=builder /app/dist ./dist

ENV PATH=/app/node_modules/.bin:$PATH

CMD ["npm", "run", "start"]
