# IncentivFlow - Arquitetura SaaS Production-Ready

## Visão Geral
Transformação de MVP monolítico para plataforma SaaS escalável para gestão de projetos de leis de incentivo, com auditoria imutável, RBAC e transições de estado validadas.

---

## 1. ARQUITETURA HIGH-LEVEL

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vite + React 19)               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   Pages     │  │   Features    │  │   Shared          │   │
│  │ (containers)│◄─┤(UI + logic)   │◄─┤(ui, hooks, api)   │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            ▼                                 │
│                    ┌──────────────┐                          │
│                    │ React Query  │  ← Server State          │
│                    │   Zustand    │  ← Client State           │
│                    └──────────────┘                          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / JWT
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Fastify)                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │   API      │  │  Services  │  │  Domain                │ │
│  │  Routes    │─►│ (business) │─►│  - Phase Engine        │ │
│  │            │  │            │  │  - Audit (append-only) │ │
│  └────────────┘  └────────────┘  │  - Notifications       │ │
│         │                               └──────────────────┘   │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Prisma ORM                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL 15 (RDS/Aurora)                      │
│  - clients, projects, phase_history, audit_logs             │
│  - documents, funding_records, users, organizations         │
│  - Indexes: idx_projects_org_status, idx_audit_immutable    │
└─────────────────────────────────────────────────────────────┘
```

### Princípios
- **Hexagonal Architecture**: Domain isolado de frameworks
- **CQRS parcial**: Writes via services, reads via optimized queries
- **Event Sourcing Light**: Audit logs como fonte da verdade para transições
- **Multi-tenancy**: organization_id em todas as tabelas

---

## 2. MODELO DE DADOS (Prisma)

**Entidades Normalizadas:**

```prisma
Organization 1──* User 1──* Project
Project 1──* PhaseHistory
Project 1──* Document
Project 1──* FundingRecord
Project 1──* AuditLog (append-only)
Client 1──* Project
```

**Regras Críticas:**
- AuditLog: SEM update/delete, apenas INSERT. Hash encadeado (prev_hash)
- PhaseHistory: transição validada por engine de regras
- Funding: requested, approved, captured (3 valores distintos)

---

## 3. PHASE TRANSITION ENGINE

Validações por etapa:
1. Elaboração → Aprovação Cliente: requer min 1 documento
2. Aprovação Cliente → Submissão: requer aprovação assinada
3. Submissão → Acompanhamento: requer protocolo + data submissão
4. Acompanhamento → Pós-Aprovação: requer valor_aprovado > 0
5. Pós-Aprovação → Concluído: requer captacao >= 80% do aprovado

---

## 4. TECNOLOGIAS

**Frontend:**
- React 19 + TypeScript strict
- Vite 6, Tailwind 3.4
- TanStack Query v5 (server state)
- Zustand (UI state, filtros)
- Recharts, date-fns, lucide-react
- React Hook Form + Zod validation

**Backend:**
- Node.js 20 LTS + Fastify 5 (performance)
- Prisma 5 + PostgreSQL 15
- JWT + refresh tokens (httpOnly cookies)
- RBAC: ADMIN, CONSULTOR, CLIENTE, AUDITOR
- Pino logger, Zod validation
- BullMQ (filas para alertas)

**Infra:**
- Docker compose local
- AWS ECS / Fly.io produção
- S3 para documentos
- CloudWatch + Sentry

---

## 5. SEGURANÇA & AUDITORIA

- AuditLog imutável: trigger DB bloqueia UPDATE/DELETE
- Hash chain: cada registro = SHA256(prev_hash + payload)
- RBAC em nível de rota + serviço
- LGPD: campo deleted_at (soft delete), encryption at rest
- Todos writes geram AuditLog automaticamente via Prisma middleware

---

## 6. ESTRUTURA DE PASTAS

```
/apps
  /api           # Fastify backend
  /web           # React frontend
/packages
  /db            # Prisma schema
  /types         # TypeScript shared
  /ui            # Design system
```

Implementação completa a seguir...