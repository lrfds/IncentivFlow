import type { FastifyInstance } from 'fastify';
import { ClientService } from '../client/client.service.js';
import { OpenCnpjService } from './open-cnpj.service.js';
import { rlsClient } from '../../core/prisma.js';

function mapIntegrationError(message: string) {
  switch (message) {
    case 'INVALID_CNPJ':
      return {
        statusCode: 400,
        error: 'INVALID_CNPJ',
        message: 'CNPJ inválido. Informe 14 dígitos.',
        manualModeRecommended: false,
      };
    case 'OPENCNPJ_NOT_FOUND':
      return {
        statusCode: 404,
        error: 'OPENCNPJ_NOT_FOUND',
        message: 'CNPJ não encontrado na base da Receita Federal.',
        manualModeRecommended: false,
      };
    case 'OPENCNPJ_RATE_LIMIT':
      return {
        statusCode: 429,
        error: 'OPENCNPJ_RATE_LIMIT',
        message: 'Limite de requisições atingido. Tente novamente em instantes.',
        manualModeRecommended: true,
      };
    case 'OPENCNPJ_SCHEMA_MISMATCH':
      return {
        statusCode: 502,
        error: 'OPENCNPJ_SCHEMA_MISMATCH',
        message: 'A resposta da OpenCNPJ mudou de formato e foi bloqueada por segurança. O modo manual está disponível.',
        manualModeRecommended: true,
      };
    case 'OPENCNPJ_TIMEOUT':
      return {
        statusCode: 504,
        error: 'OPENCNPJ_TIMEOUT',
        message: 'A OpenCNPJ demorou mais do que o esperado para responder. Tente novamente ou siga em modo manual.',
        manualModeRecommended: true,
      };
    case 'OPENCNPJ_NETWORK_ERROR':
      return {
        statusCode: 502,
        error: 'OPENCNPJ_NETWORK_ERROR',
        message: 'Não foi possível alcançar a OpenCNPJ no momento. O modo manual foi liberado.',
        manualModeRecommended: true,
      };
    default:
      return {
        statusCode: 502,
        error: 'OPENCNPJ_UPSTREAM_ERROR',
        message: 'Não foi possível consultar a OpenCNPJ no momento.',
        manualModeRecommended: true,
      };
  }
}

export async function registerCnpjRoutes(server: FastifyInstance) {
  server.get('/api/integrations/cnpj/status', async (_request, reply) => {
    reply
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0');

    try {
      const status = await OpenCnpjService.getStatus();
      return reply.code(200).send(status);
    } catch {
      return reply.code(200).send({
        status: 'offline',
        latency: null,
        provider: 'OpenCNPJ',
        checkedAt: new Date().toISOString(),
      });
    }
  });

  server.get('/api/integrations/cnpj/:cnpj/analysis', async (request: any, reply) => {
    const { cnpj } = request.params as { cnpj: string };

    let userContext: { organizationId?: string; userId?: string } | null = null;
    let db: any = null;

    try {
      await request.jwtVerify();
      userContext = {
        organizationId: request.user?.organizationId,
        userId: request.user?.userId,
      };
      db = rlsClient(userContext.organizationId as string, userContext.userId as string);
    } catch {
      userContext = null;
      db = rlsClient('SYSTEM', 'SYSTEM');
    }

    try {
      const payload = await ClientService.lookupDossier(db, cnpj, {
        organizationId: userContext?.organizationId,
        userId: userContext?.userId,
      });

      return {
        ...payload,
        runtime: {
          mode: OpenCnpjService.getRuntimeMode(),
          provider: OpenCnpjService.getProviderName(),
          authenticated: Boolean(userContext?.organizationId),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OPENCNPJ_UPSTREAM_ERROR';
      const mapped = mapIntegrationError(message);

      return reply.code(mapped.statusCode).send({
        error: mapped.error,
        message: mapped.message,
        manualModeRecommended: mapped.manualModeRecommended,
        runtime: {
          mode: OpenCnpjService.getRuntimeMode(),
          provider: OpenCnpjService.getProviderName(),
          authenticated: Boolean(userContext?.organizationId),
        },
      });
    }
  });
}
