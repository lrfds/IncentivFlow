# 💎 IncentivFlow Diamond Enterprise

Plataforma de alta performance para gestão do ciclo de vida de incentivos fiscais, construída com foco em **Imutabilidade**, **Inteligência de Dados** e **Governança**.

## 🏛️ Arquitetura de Governança (RBAC)
O sistema implementa o controle de acesso baseado em funções para blindagem operacional:
- **CONSULTANT**: Operação diária (Cadastro 360, Agenda, Tracker).
- **MANAGER**: Visão estratégica e Dashboard Financeiro.
- **AUDITOR**: Validação da Hash Chain e integridade técnica.

## 🛡️ Camadas de Confiança
1. **Hash Chain Criptográfica**: Cada evento (Cadastro, Submissão, Mudança de Status) gera um elo imutável no banco de dados.
2. **Audit Timeline**: Visualização transparente do rastro de auditoria para compliance.
3. **Phase Engine**: Validador documental que impede submissões incompletas.

## 🧠 Inteligência Minerada
- **Cadastro 360º**: Enriquecimento automático via BrasilAPI/OpenCNPJ.
- **Financial Health Dashboard**: Projeções de faturamento baseadas em potencial real.
- **PDF Dossier Engine**: Geração de documentos institucionais com selo de integridade SHA-256.

## 📨 Infraestrutura Resiliente (Render)
- **API (Fastify + Prisma)**: Backend de alto desempenho.
- **Outbox Worker**: Processamento assíncrono de notificações via Resend.
- **Web Frontend (React 19)**: Interface modular com design Glassmorphism.

## 🚀 Script de Produção
Para rodar o ecossistema em ambiente local ou nuvem:

```bash
# 1. Instalar Dependências
npm install

# 2. Sincronizar Banco de Dados
npx prisma generate
npx prisma db push

# 3. Rodar Serviços
npm run dev # API + Web
node dist/workers/outbox.worker.js # Background Worker
```

---
**v2.5 Diamond - Excellence in Incentive Management** 🏆💎
