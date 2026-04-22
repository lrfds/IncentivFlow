# STAGE 1: Build — node:20-slim (Debian) recomendado pelo Prisma
FROM node:20-slim AS builder

# Dependências nativas para Prisma no Debian
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependências (sem postinstall de prisma)
COPY package*.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN npm install --ignore-scripts

# Copiar código-fonte completo
COPY . .
RUN rm -rf .env packages/db/.env apps/api/.env apps/web/.env

# Gerar Prisma Client com binário local (sem npx, sem rede)
RUN node_modules/.bin/prisma generate --schema=packages/db/schema.prisma

# Compilar todos os pacotes e apps
RUN npm run build

# ─────────────────────────────────────────────
# STAGE 2: Production Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime libs para Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Segurança: usuário não-root
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiuser

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
CMD node_modules/.bin/prisma migrate deploy --schema=./packages/db/schema.prisma && node apps/api/dist/server.js
