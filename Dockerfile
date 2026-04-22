# STAGE 1: Build (Elite Multi-stage build)
FROM node:20-alpine AS builder

# Dependências do sistema para Prisma + OpenSSL
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Instalar dependências do monorepo (cache layer)
COPY package*.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN npm install

# Copiar código-fonte completo antes do prisma generate
COPY . .
RUN rm -rf .env packages/db/.env apps/api/.env apps/web/.env

# Gerar Prisma Client (library engine — sem download de binários)
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
ENV PRISMA_CLI_BINARY_TARGETS="native,linux-musl-openssl-3.0.x"
RUN cd packages/db && npx prisma generate --no-engine

# Compilar todos os pacotes e apps
RUN npm run build

# STAGE 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Dependências de runtime para Prisma
RUN apk add --no-cache openssl libc6-compat

# Segurança: usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S apiuser -u 1001

# Copiar apenas artefatos compilados
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/api-client ./packages/api-client
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/package.json ./package.json

# Permissões
RUN chown -R apiuser:nodejs /app
USER apiuser

EXPOSE 3000

# Migrations + Start
CMD npx prisma migrate deploy --schema=./packages/db/schema.prisma && node apps/api/dist/server.js
