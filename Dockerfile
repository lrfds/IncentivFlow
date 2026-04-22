# ═══════════════════════════════════════════════════════════
# IncentivFlow Black Label — Dockerfile Diamond Edition
# Base: node:20-slim (Debian) — Recomendado pelo Prisma
# Estratégia: engineType=library → zero download de binários
# ═══════════════════════════════════════════════════════════

# ── STAGE 1: Builder ────────────────────────────────────────
FROM node:20-slim AS builder

# Dependências nativas do sistema para Prisma + OpenSSL
RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifests primeiro (otimiza cache Docker)
COPY package*.json ./
COPY packages/db/package.json       ./packages/db/
COPY packages/core/package.json     ./packages/core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json          ./apps/web/
COPY apps/api/package.json          ./apps/api/

# Instalar todas as dependências do monorepo
RUN npm install

# Copiar código-fonte completo
COPY . .

# Limpar arquivos .env (segredos vêm de variáveis de ambiente do Render)
RUN find . -name ".env*" -not -path "*/node_modules/*" -delete || true

# Gerar Prisma Client via binário local (sem npx, sem rede)
# engineType=library no schema garante zero download de query engine
RUN node_modules/.bin/prisma generate --schema=packages/db/schema.prisma

# Compilar todo o monorepo na ordem de dependências
RUN npm run build

# ── STAGE 2: Runner (Production) ────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Runtime: apenas openssl necessário para Prisma library engine
RUN apt-get update -y \
    && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Segurança: usuário não-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 apiuser

# Copiar apenas artefatos de produção (imagem mínima)
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/packages/core         ./packages/core
COPY --from=builder /app/packages/api-client   ./packages/api-client
COPY --from=builder /app/packages/db           ./packages/db
COPY --from=builder /app/apps/api/dist         ./apps/api/dist
COPY --from=builder /app/apps/web/dist         ./apps/web/dist
COPY --from=builder /app/package.json          ./package.json

# Aplicar permissões mínimas
RUN chown -R apiuser:nodejs /app
USER apiuser

# Render injeta PORT automaticamente
EXPOSE 3000

# Executar migrations e iniciar servidor
CMD node_modules/.bin/prisma migrate deploy \
    --schema=./packages/db/schema.prisma \
    && node apps/api/dist/server.js
