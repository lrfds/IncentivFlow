import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { rlsClient, DbClient } from './core/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemDb = rlsClient('SYSTEM', 'SYSTEM');
import { ProjectService } from './modules/project/project.service.js';
import { PhaseEngine } from './modules/phase/phase.engine.js';
import { EventStore } from './modules/events/event.store.js';
import { AuditService } from './modules/audit/service.js';
import { can } from './core/rbac.js';
import { registerCnpjRoutes } from './modules/cnpj/routes.js';
import { registerClientRoutes } from './modules/client/routes.js';
import { PhaseType } from '@prisma/client';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET must be defined in production. Boot aborted.');
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters for security.');
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

import {
  LoginSchema,
  GetProjectsQuerySchema,
  CreateProjectSchema,
  ProjectParamsSchema,
  ChangePhaseSchema,
  ApproveValueSchema
} from '@incentivflow/shared';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; organizationId: string; role: string; email: string };
    user: any;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    db: DbClient;
  }
  interface FastifyInstance {
    authorize: (permission: string) => any;
  }
}

// Plugins
const allowedOrigins = (process.env.WEB_URLS || process.env.WEB_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, '')) // remove trailing slash
  .filter(Boolean);

// URL canônica do Render (remove trailing slash se presente)
const RENDER_URL = (process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');

await server.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.includes(origin)
      || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      || (RENDER_URL && origin === RENDER_URL);

    callback(isAllowed ? null : new Error('Origin not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await server.register(cookie);
await server.register(jwt, {
  secret: process.env.JWT_SECRET as string,
  cookie: { cookieName: 'token', signed: false },
});

// Auth hook - CRITICAL: Sets RLS context per request
server.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
    // Inject tenant-scoped prisma proxy
    request.db = rlsClient(request.user.organizationId, request.user.userId);
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// RBAC hook
server.decorate('authorize', (permission: string) => {
  return async (request: any, reply: any) => {
    if (!can(request.user.role, permission)) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
});

// Serve Web App (SPA)
await server.register(fastifyStatic, {
  root: path.join(__dirname, '../../web/dist'),
  prefix: '/',
  wildcard: false,
});


// ==================== ROUTES ====================

// Health
server.get('/health', async () => {
  try {
    await systemDb.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'connected', version: '2.5-Diamond', ts: new Date().toISOString() };
  } catch (e) {
    return { status: 'degraded', db: 'disconnected', ts: new Date().toISOString() };
  }
});

await registerCnpjRoutes(server);
await registerClientRoutes(server);

// Auth
server.post('/api/auth/login', async (request, reply) => {
  const result = LoginSchema.safeParse(request.body);
  if (!result.success) return reply.code(400).send({ error: result.error.errors });

  const { email, password } = result.data;
  
  const user = await systemDb.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  // In production: verify bcrypt hash
  // const valid = await bcrypt.compare(password, user.passwordHash);
  
  const token = server.jwt.sign({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
  });

  reply.setCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
});

// Projects
server.get('/api/projects', 
  { preHandler: [(server as any).authenticate] },
  async (request, reply) => {
    const q = GetProjectsQuerySchema.safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.errors });

    const { organizationId } = request.user as any;
    const { phase, status, search } = q.data;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (phase) where.currentPhase = phase;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Use request.db (Tenant isolated)
    const projects = await request.db.projectReadModel.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return { projects };
  }
);

server.post('/api/projects',
  { preHandler: [(server as any).authenticate, (server as any).authorize('project:write')] },
  async (request, reply) => {
    const payload = CreateProjectSchema.safeParse(request.body);
    if (!payload.success) return reply.code(400).send({ error: payload.error.errors });

    const { organizationId, userId } = request.user as any;

    try {
      const project = await ProjectService.create(request.db, {
        ...payload.data,
        organizationId,
        userId,
      });

      return { project };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
);

server.get('/api/projects/:id',
  { preHandler: [(server as any).authenticate] },
  async (request, reply) => {
    const params = ProjectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.errors });

    const { id } = params.data;
    const { organizationId } = request.user as any;

    const result = await ProjectService.getWithHistory(request.db, id);
    
    if (!result.project || result.project.organizationId !== organizationId) {
      return reply.code(404).send({ error: 'Not found' });
    }

    return result;
  }
);

server.post('/api/projects/:id/phase',
  { preHandler: [(server as any).authenticate, (server as any).authorize('project:write')] },
  async (request, reply) => {
    const params = ProjectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.errors });

    const payload = ChangePhaseSchema.safeParse(request.body);
    if (!payload.success) return reply.code(400).send({ error: payload.error.errors });

    const { targetPhase, notes, metadata } = payload.data;
    const { organizationId, userId } = request.user as any;

    try {
      const project = await ProjectService.changePhase(request.db, {
        projectId: params.data.id,
        targetPhase,
        organizationId,
        userId,
        notes,
        metadata,
      });

      return { project };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
);

server.post('/api/projects/:id/approve',
  { preHandler: [(server as any).authenticate, (server as any).authorize('project:approve')] },
  async (request, reply) => {
    const params = ProjectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.errors });

    const payload = ApproveValueSchema.safeParse(request.body);
    if (!payload.success) return reply.code(400).send({ error: payload.error.errors });

    const { amount, reference } = payload.data;
    const { organizationId, userId } = request.user as any;

    try {
      const project = await ProjectService.approveValue(request.db, {
        projectId: params.data.id,
        amount,
        organizationId,
        userId,
        reference,
      });

      return { project };
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
);

// Phase validation (dry run)
server.post('/api/projects/:id/validate-phase',
  { preHandler: [(server as any).authenticate] },
  async (request, reply) => {
    const params = ProjectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.errors });

    const payload = z.object({ targetPhase: z.nativeEnum(PhaseType) }).safeParse(request.body);
    if (!payload.success) return reply.code(400).send({ error: payload.error.errors });

    const { organizationId } = request.user as any;

    const validation = await PhaseEngine.validate(request.db, params.data.id, payload.data.targetPhase, organizationId);
    return validation;
  }
);

// Events (audit)
server.get('/api/audit',
  { preHandler: [(server as any).authenticate, (server as any).authorize('audit:read')] },
  async (request, reply) => {
    const { organizationId } = request.user as any;
    const result = await AuditService.getLogs(request.db, organizationId, { limit: 50 });
    return result;
  }
);

server.get('/api/projects/:id/events',
  { preHandler: [(server as any).authenticate, (server as any).authorize('audit:read')] },
  async (request, reply) => {
    const params = ProjectParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.errors });

    const events = await EventStore.getStream(params.data.id, 0, request.db);
    const verification = await EventStore.verifyChain(params.data.id, request.db);
    
    return {
      events,
      chainValid: verification.valid,
      chainBrokenAt: verification.brokenAt,
    };
  }
);

// Dashboard KPIs
server.get('/api/dashboard/kpis',
  { preHandler: [(server as any).authenticate] },
  async (request) => {
    const { organizationId } = request.user as any;

    const [total, byPhase, financials, upcoming] = await Promise.all([
      request.db.project.count({
        where: { organizationId, deletedAt: null },
      }),
      request.db.project.groupBy({
        by: ['currentPhase'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      request.db.project.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: {
          valueRequested: true,
          valueApproved: true,
          valueCaptured: true,
        },
      }),
      request.db.project.count({
        where: {
          organizationId,
          deletedAt: null,
          submissionDeadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalProjects: total,
      byPhase: byPhase.reduce((acc, p) => ({ ...acc, [p.currentPhase]: p._count }), {}),
      financials: {
        requested: Number(financials._sum.valueRequested ?? 0),
        approved: Number(financials._sum.valueApproved ?? 0),
        captured: Number(financials._sum.valueCaptured ?? 0),
      },
      upcomingDeadlines: upcoming,
    };
  }
);

// SPA routing fallback - MUST BE LAST
server.setNotFoundHandler((request, reply) => {
  if (request.raw.url?.startsWith('/api')) {
    return reply.code(404).send({ error: 'API route not found' });
  }
  return reply.sendFile('index.html');
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API running on http://localhost:${port}`);
    
    // Seed phase configs on first run
    if (process.env.SEED_PHASES === 'true') {
      await PhaseEngine.seedDefaults(systemDb);
      console.log('✅ Phase configs seeded');
    }

    // Ensure Master Admin exists for first login
    const adminEmail = 'admin@incentivflow.com';
    const adminExists = await systemDb.user.findUnique({ where: { email: adminEmail } });
    
    if (!adminExists) {
      console.log('🌱 Seeding Master Admin...');
      const org = await systemDb.organization.upsert({
        where: { cnpj: '00.000.000/0001-00' },
        update: {},
        create: { 
          name: 'IncentivFlow Master', 
          cnpj: '00.000.000/0001-00',
          plan: 'ENTERPRISE'
        }
      });

      await systemDb.user.create({
        data: {
          email: adminEmail,
          name: 'Master Admin',
          role: 'ADMIN',
          organizationId: org.id,
          passwordHash: await import('bcryptjs').then(b => b.hash('admin123', 12))
        }
      });
      console.log(`👤 Master Admin created: ${adminEmail} / admin123`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();