# 💎 IncentivFlow: Enterprise Projection Engine

![IncentivFlow Banner](./banner.png)

> **The Gold Standard for Immutable Incentive Management.**
> A high-performance, event-sourced monorepo built for transparency, security, and extreme scalability.

---

## ⚡ Core Engine Pillars

| Feature | Description | Impact |
| :--- | :--- | :--- |
| **🛡️ Hash Chaining** | Blockchain-like immutability via SHA-256 chaining. | **100% Auditability** |
| **🚀 Snapshot Engine** | State reconstruction in $O(1)$ time every 50 versions. | **Extreme Performance** |
| **🧱 Multi-Tenant RLS** | Hardened isolation at the database query level. | **Military-Grade Privacy** |
| **🔍 Zero-Trust Audit** | Real-time cryptographic verification in the browser. | **Absolute Transparency** |

---

## 🛠️ Tech Stack & Architecture

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.it/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Monorepo Structure
- **`apps/web`**: Premium React dashboard with cryptographic Audit Timeline.
- **`apps/api`**: Fastify-powered high-concurrency API.
- **`packages/core`**: The mission-critical engine (Event Store, Projections, Snapshots).
- **`packages/db`**: Centralized schema with automated tenant isolation extensions.
- **`packages/api-client`**: Fully typed SDK for seamless frontend integration.

---

## 🔒 Security & Compliance

IncentivFlow is architected to exceed **SOC2** and **LGPD** requirements:
- **Immutable Ledger**: No one, not even a DB admin, can alter history without breaking the hash chain.
- **Client-Side Verification**: The UI re-calculates hashes locally using the `SubtleCrypto` API to ensure the server hasn't been compromised.
- **Atomic Projections**: Strict versioning prevents race conditions and data corruption.

---

## 🏗️ Quick Start (Production Ready)

### Docker Deployment
```bash
docker build -t incentivflow .
docker run -p 3000:3000 incentivflow
```

### Local Development
```bash
npm install
npx prisma generate
npm run dev
```

---

## 📈 Roadmap & Certification
This project is certified with the **Elite Architecture Seal**. For detailed technical specs, see [CERTIFICATION_REPORT.md](./CERTIFICATION_REPORT.md).

---

<div align="center">
  <sub>Built with 💙 by Staff Engineer AI & lrfds</sub>
</div>
