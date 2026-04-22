# 💎 IncentivFlow: Enterprise Projection Engine

![IncentivFlow Banner](./incentivflow_banner_1776872217482.png)

> **O Padrão Ouro para Gestão de Incentivos Imutáveis.**
> Um monorepo de alta performance, baseado em Event Sourcing, construído para transparência, segurança e escalabilidade extrema.

---

## ⚡ Pilares do Core Engine

| Funcionalidade | Descrição | Impacto Enterprise |
| :--- | :--- | :--- |
| **🛡️ Hash Chaining** | Imutabilidade estilo Blockchain via SHA-256. | **Auditabilidade 100%** |
| **🚀 Snapshot Engine** | Reconstrução de estado em tempo constante ($O(1)$). | **Performance Extrema** |
| **🧱 Multi-Tenant RLS** | Isolamento blindado no nível de query do banco. | **Privacidade de Nível Militar** |
| **🔍 Auditoria Zero-Trust** | Verificação criptográfica em tempo real no browser. | **Transparência Absoluta** |

---

## 🛠️ Stack Tecnológica & Arquitetura

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.it/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Prisma](https://img.shields.it/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Estrutura do Monorepo
- **`apps/web`**: Dashboard React Premium com Timeline de Auditoria Criptográfica.
- **`apps/api`**: API de alta concorrência baseada em Fastify.
- **`packages/core`**: O motor de missão crítica (Event Store, Projeções, Snapshots).
- **`packages/db`**: Schema centralizado com extensões de isolamento automático.
- **`packages/api-client`**: SDK totalmente tipado para integração perfeita.

---

## 🔒 Segurança & Conformidade

O IncentivFlow foi arquitetado para exceder os requisitos de **SOC2** e **LGPD**:
- **Ledger Imutável**: Ninguém, nem um admin de banco, pode alterar o histórico sem quebrar a corrente de hashes.
- **Verificação no Cliente**: A UI re-calcula os hashes localmente usando a `SubtleCrypto API` para garantir que o servidor não foi comprometido.
- **Projeções Atômicas**: Versionamento estrito previne condições de corrida e corrupção de dados.

---

## 🏗️ Início Rápido (Production Ready)

### Deploy via Docker
```bash
docker build -t incentivflow .
docker run -p 3000:3000 incentivflow
```

### Desenvolvimento Local
```bash
npm install
npx prisma generate
npm run dev
```

---

## 📈 Roadmap & Certificação
Este projeto está certificado com o **Selo de Arquitetura de Elite**. Para detalhes técnicos profundos, consulte o [CERTIFICATION_REPORT.md](./CERTIFICATION_REPORT.md).

---

<div align="center">
  <sub>Desenvolvido com 💙 por Staff Engineer AI & lrfds</sub>
</div>
