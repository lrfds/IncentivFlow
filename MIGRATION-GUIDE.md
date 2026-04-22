# IncentivFlow v2.0 - Guia de Migração para Produção

## ✅ O QUE FOI IMPLEMENTADO

### 1. Arquitetura Backend Completa
**Localização**: `apps/api/`

- **Fastify 5** com TypeScript strict
- **Prisma ORM** com PostgreSQL
- **Phase Engine** com validações de negócio
- **Audit Log imutável** com hash chain SHA-256
- **JWT Authentication** + RBAC
- **Middleware de auditoria automática**

**Arquivos principais:**
- `src/server.ts` - API completa (auth, projects, dashboard, audit)
- `src/domain/phase-engine.ts` - Motor de transições com regras
- `src/lib/prisma.ts` - Cliente com middleware de audit
- `packages/db/schema.prisma` - Schema normalizado

### 2. Modelo de Dados Normalizado

```sql
Organization (multi-tenancy)
  └── User (RBAC: ADMIN, CONSULTOR, CLIENTE, AUDITOR)
  └── Client
       └── Project
            ├── PhaseHistory (transições validadas)
            ├── Document (com checksum)
            ├── FundingRecord (solicitado/aprovado/captado)
            └── AuditLog (APPEND-ONLY, hash chain)
```

**Índices críticos:**
- `idx_projects_org_status`
- `idx_audit_immutable`
- `idx_phase_history_project`

### 3. Frontend Refatorado

**Localização**: `apps/web/src/`

- **React Query** para server state
- **Zustand** para client state (auth)
- **Componentes desacoplados**:
  - `features/dashboard/Dashboard.tsx`
  - `features/projects/ProjectList.tsx`
  - `stores/auth.ts`
  - `lib/api.ts`

### 4. Recursos Críticos Implementados

✅ **Audit Trail Imutável**
- Middleware Prisma intercepta todos writes
- Hash chain: `SHA256(prev_hash + payload)`
- Sem UPDATE/DELETE possível (trigger DB recomendado)
- IP, user-agent, timestamp automático

✅ **Phase Transition Engine**
```typescript
ELABORACAO → APROVACAO_CLIENTE (requere: docs ≥1, valor)
APROVACAO_CLIENTE → SUBMISSAO (requere: aprovação cliente)
SUBMISSAO → ACOMPANHAMENTO (requere: protocolo, data)
ACOMPANHAMENTO → POS_APROVACAO (requere: valor_aprovado > 0)
POS_APROVACAO → CONCLUIDO (requere: captacao ≥ 80%)
```

✅ **Financial Tracking**
- `valueRequested`, `valueApproved`, `valueCaptured` (Decimal 15,2)
- Histórico em `FundingRecord` com referências

✅ **RBAC**
- Decorator `authenticate` em todas rotas
- `request.user.role` disponível nos handlers
- Multi-tenancy via `organizationId`

---

## 🚀 COMO EXECUTAR

### Desenvolvimento Local

```bash
# 1. Banco de dados
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# 2. Configurar .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/incentivflow"
JWT_SECRET="seu-secret-super-seguro"

# 3. Migrar DB
cd packages/db
npx prisma db push
npx prisma db seed

# 4. Rodar API
cd apps/api
npm install
npm run dev # porta 4000

# 5. Rodar Web
cd apps/web
npm install
npm run dev # porta 5173
```

### Produção (Docker)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
CMD ["node", "dist/server.js"]
```

---

## 📊 ENDPOINTS IMPLEMENTADOS

### Autenticação
- `POST /auth/login` - Retorna JWT httpOnly cookie
- `POST /auth/logout`
- `GET /me`

### Projetos
- `GET /projects?search=&phase=&status=`
- `GET /projects/:id` - Inclui histórico, docs, funding
- `POST /projects` - Cria com validação Zod
- `POST /projects/:id/transition` - **Com validação do Phase Engine**

### Dashboard
- `GET /dashboard/kpis` - Total, valores, prazos, distribuição

### Auditoria
- `GET /audit?projectId=` - Logs imutáveis com hash

### Clientes
- `GET /clients`

---

## 🔐 SEGURANÇA

1. **Audit Imutável**: Middleware + trigger DB
   ```sql
   CREATE OR REPLACE FUNCTION prevent_audit_update()
   RETURNS TRIGGER AS $$
   BEGIN RAISE EXCEPTION 'Audit logs são imutáveis'; END; $$;
   ```

2. **Hash Chain Verification**:
   ```typescript
   async function verifyChain(logs) {
     for (let i = 1; i < logs.length; i++) {
       const expected = sha256(logs[i-1].hash + payload);
       if (expected !== logs[i].hash) throw Error('Chain broken');
     }
   }
   ```

3. **RBAC por rota**:
   ```typescript
   server.get('/admin', { 
     preHandler: [authenticate, requireRole('ADMIN')] 
   })
   ```

---

## 📈 PRÓXIMOS PASSOS

1. **Documentos**: Integrar S3 + presigned URLs
2. **Alertas**: BullMQ + cron para prazos
3. **Relatórios**: Endpoints com agregações
4. **Testes**: Vitest + Playwright
5. **CI/CD**: GitHub Actions → ECS

---

## 🎯 DIFERENCIAIS DA V2

| Recurso | V1 (Mock) | V2 (Production) |
|---------|-----------|-----------------|
| Dados | useState | PostgreSQL + Prisma |
| Auditoria | Array mutável | Hash chain imutável |
| Transições | setState | Phase Engine validado |
| Auth | Nenhum | JWT + RBAC + Multi-tenant |
| Escalabilidade | 0 | Horizontal (stateless API) |
| Compliance | Visual | LGPD + trilha criptográfica |