# STAGE 1: Build (Elite Multi-stage build)
FROM node:20-alpine AS builder
WORKDIR /app

# Install monorepo dependencies first for caching
COPY package*.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN npm install

# Generate Prisma Client (Source of Truth for Event Sourcing)
COPY packages/db ./packages/db
RUN cd packages/db && npx prisma generate

# Build all packages and apps
COPY . .
RUN npm run build

# STAGE 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Security: Best practice to run as non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy compiled artifacts only
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/package.json ./package.json

# User permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Default command starts the API (which might serve the Web app or work as a separate service)
CMD ["node", "apps/api/dist/server.js"]
