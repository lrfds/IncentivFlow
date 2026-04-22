# IncentivFlow - Production Backend

## 🏗️ Arquitetura Implementada

### Core Modules (/apps/api/src/core)
- **prisma.ts** - Cliente Prisma com middleware de auditoria automática
- **auth.ts** - Autenticação com bcrypt, JWT, rate limiting
- **rbac.ts** - Controle de acesso baseado em roles (ADMIN, CONSULTOR, CLIENTE, AUDITOR)
- **rls.ts** - Row-Level Security em nível de aplicação (multi-tenancy)

### Domain Modules (/apps/api/src/modules)
- **project/service.ts** - CRUD completo, validações, transações
- **phase/service.ts** - Engine de transições com regras de negócio
- **audit/service.ts** - Log imutável com verificação de cadeia hash + timeline
- **events/index.ts** - Event bus (outbox pattern)

### Workers (/apps/api/src/workers)
- **queue.ts** - Fila em memória + scheduler para alertas de deadline

## 🔐 Segurança Implementada

1. **Audit Log Imutável**
   - Hash chain SHA-256 (prevHash → hash)
   - Sem campo updatedAt (append-only)
   - Middleware Prisma automático
   - Verificação de integridade via /audit/verify

2. **Multi-tenancy**
   - organizationId em todas as queries
   - RLS via aplicação
   - Validação de ownership

3. **RBAC Granular**
   - 15 permissões distintas
   - Middleware por rota
   - Validação de transições por role

4. **Autenticação**
   - JWT em httpOnly cookie
   - Rate limiting (5 tentativas/15min)
   - Bcrypt com salt 12

## 📊 Database Schema (Prisma)

Entidades normalizadas:
- **Organization** (tenant) 1→N User, Client, Project
- **User** com role e org
- **Client** com soft delete
- **Project** com 3 valores financeiros (requested, approved, captured)
- **PhaseHistory** - cada transição
- **Document** - com checksum SHA256
- **FundingRecord** - histórico financeiro
- **AuditLog** - imutável, com hash chain

Indexes estratégicos para queries rápidas.

## 🔄 Phase Engine - Regras

```typescript
ELABORACAO → APROVACAO_CLIENTE
  Requer: título, descrição, valueRequested, ≥1 documento
  
APROVACAO_CLIENTE → SUBMISSAO
  Requer: aprovação do cliente
  
SUBMISSAO → ACOMPANHAMENTO
  Requer: protocolNumber, submittedAt
  
ACOMPANHAMENTO → POS_APROVACAO
  Requer: valueApproved
  
POS_APROVACAO → CONCLUIDO
  Requer: captacao ≥ 90% do aprovado
```

## 🚀 Como rodar

```bash
cd apps/api
cp .env.example .env
# Editar DATABASE_URL

npm install
npx prisma generate
npx prisma migrate dev --name init
npx tsx src/server.ts
```

## 📡 API Endpoints

### Auth
- POST /auth/login
- POST /auth/logout
- GET /me

### Projects
- GET /projects?status=&phase=&search=
- GET /projects/:id
- POST /projects
- POST /projects/:id/transition

### Audit
- GET /audit?projectId=
- GET /audit/verify (verifica integridade da cadeia)
- GET /audit/timeline/:projectId

### Dashboard
- GET /dashboard/kpis

## 🔔 Eventos & Workers

Eventos publicados:
- ProjectCreated
- PhaseTransitioned  
- ProjectApproved
- DeadlineApproaching

Workers:
- Alerta de deadline (7 dias antes)
- Verificação de auditoria diária
- Processamento de documentos

## ✅ Production Checklist

- [x] Hash chain para audit log
- [x] Soft delete em entidades
- [x] Transações para operações críticas
- [x] Validação Zod em inputs
- [x] Rate limiting
- [x] Multi-tenancy completo
- [x] RBAC granular
- [x] Event sourcing básico
- [x] Scheduler para alertas
- [x] Índices de performance
- [x] Tipos TypeScript strict

## 🔜 Próximos passos (fora do escopo atual)

1. Migrar queue para BullMQ + Redis
2. Implementar S3 para documentos
3. Webhooks para integrações
4. GraphQL como alternativa ao REST
5. Testes E2E com Vitest
6. Docker compose completo
7. CI/CD pipeline