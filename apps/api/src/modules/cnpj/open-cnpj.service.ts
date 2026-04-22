import { createHash } from 'node:crypto';
import { IncentiveEngine, type NormalizedCnpjDossier } from './incentive-engine.js';
import { buildOpenCnpjDossier } from './open-cnpj.mapper.js';
import { OpenCnpjResponseSchema, type OpenCnpjResponse } from '@incentivflow/shared';

const DOSSIER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.OPENCNPJ_TIMEOUT_MS || 10_000);
const HEALTH_CHECK_TIMEOUT_MS = Number(process.env.OPENCNPJ_HEALTH_TIMEOUT_MS || 8_000);
const OPEN_CNPJ_BASE_URL = (process.env.OPENCNPJ_BASE_URL || 'https://api.opencnpj.org').replace(/\/+$/, '');
const OPEN_CNPJ_DATASETS = process.env.OPENCNPJ_DATASETS || 'receita';
const OPEN_CNPJ_HEALTH_CNPJ = (process.env.OPENCNPJ_HEALTH_CNPJ || '17283532000186').replace(/\D/g, '');
const ALLOW_INVALID_TLS = process.env.OPENCNPJ_ALLOW_INVALID_TLS === 'true';

interface LookupPayload {
  dadosCnpj: NormalizedCnpjDossier;
  analiseIncentivos: ReturnType<typeof IncentiveEngine.analyze>;
  consultadoEm: string;
  cache: {
    hit: boolean;
    source: 'api' | 'local-cache';
    expiresAt?: string;
    stale?: boolean;
    staleReason?: string;
  };
  warnings?: string[];
}

interface CacheEntry {
  expiresAt: number;
  payload: LookupPayload;
}

interface HealthStatusResult {
  status: 'online' | 'offline';
  latency: number | null;
  provider: 'OpenCNPJ';
  checkedAt: string;
}

class OpenCnpjError extends Error {
  code: string;
  statusCode?: number;

  constructor(code: string, statusCode?: number) {
    super(code);
    this.name = 'OpenCnpjError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const lookupCache = new Map<string, CacheEntry>();

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function configureTlsForOpenCnpj() {
  if (ALLOW_INVALID_TLS && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}

function withTimeout(timeoutMs = REQUEST_TIMEOUT_MS, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeout),
  };
}

function getCacheKey(cnpj: string, organizationId?: string): string {
  return createHash('sha256').update(`${organizationId || 'public'}:${onlyDigits(cnpj)}`).digest('hex');
}

function buildOpenCnpjUrl(cnpj: string, datasets = OPEN_CNPJ_DATASETS): string {
  const url = new URL(`${OPEN_CNPJ_BASE_URL}/${onlyDigits(cnpj)}`);

  if (datasets) {
    url.searchParams.set('datasets', datasets);
  }

  return url.toString();
}

function validatePayload(payload: unknown): OpenCnpjResponse {
  const parsed = OpenCnpjResponseSchema.safeParse(payload);
  if (!parsed.success) {
    console.error('[OpenCNPJ] schema mismatch', parsed.error.flatten());
    throw new OpenCnpjError('OPENCNPJ_SCHEMA_MISMATCH', 502);
  }

  return parsed.data;
}

function buildResponse(
  dadosCnpj: NormalizedCnpjDossier,
  cache: { hit: boolean; source: 'api' | 'local-cache'; expiresAt?: string; stale?: boolean; staleReason?: string },
): LookupPayload {
  return {
    dadosCnpj,
    analiseIncentivos: IncentiveEngine.analyze(dadosCnpj),
    consultadoEm: new Date().toISOString(),
    cache,
  };
}

async function fetchOpenCnpj(cnpj: string): Promise<OpenCnpjResponse> {
  configureTlsForOpenCnpj();
  const timeout = withTimeout();

  try {
    const response = await fetch(buildOpenCnpjUrl(cnpj), {
      headers: {
        accept: 'application/json',
      },
      signal: timeout.signal,
    });

    if (response.status === 404) {
      throw new OpenCnpjError('OPENCNPJ_NOT_FOUND', 404);
    }

    if (response.status === 429) {
      throw new OpenCnpjError('OPENCNPJ_RATE_LIMIT', 429);
    }

    if (!response.ok) {
      throw new OpenCnpjError('OPENCNPJ_UPSTREAM_ERROR', response.status);
    }

    const json = await response.json() as unknown;
    return validatePayload(json);
  } catch (error) {
    if (error instanceof OpenCnpjError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenCnpjError('OPENCNPJ_TIMEOUT', 504);
    }
    throw new OpenCnpjError('OPENCNPJ_NETWORK_ERROR', 502);
  } finally {
    timeout.dispose();
  }
}

export class OpenCnpjService {
  static getRuntimeMode(): 'production' {
    return 'production';
  }

  static getProviderName(): 'OpenCNPJ' {
    return 'OpenCNPJ';
  }

  static getCacheKey(cnpj: string, organizationId?: string): string {
    return getCacheKey(cnpj, organizationId);
  }

  static async getStatus(): Promise<HealthStatusResult> {
    configureTlsForOpenCnpj();
    const startedAt = Date.now();
    const timeout = withTimeout(HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(buildOpenCnpjUrl(OPEN_CNPJ_HEALTH_CNPJ), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: timeout.signal,
      });

      const latency = Date.now() - startedAt;
      const online = response.ok || response.status === 404;

      return {
        status: online ? 'online' : 'offline',
        latency: online ? latency : null,
        provider: 'OpenCNPJ',
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[OpenCNPJ] health check failed', {
        baseUrl: OPEN_CNPJ_BASE_URL,
        datasets: OPEN_CNPJ_DATASETS,
        timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
        healthCnpj: OPEN_CNPJ_HEALTH_CNPJ,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });

      return {
        status: 'offline',
        latency: null,
        provider: 'OpenCNPJ',
        checkedAt: new Date().toISOString(),
      };
    } finally {
      timeout.dispose();
    }
  }

  static async lookup(cnpjInput: string, options?: { organizationId?: string }): Promise<LookupPayload> {
    const cnpj = onlyDigits(cnpjInput);
    if (cnpj.length !== 14) {
      throw new OpenCnpjError('INVALID_CNPJ', 400);
    }

    const cacheKey = getCacheKey(cnpj, options?.organizationId);
    const now = Date.now();
    const cached = lookupCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return {
        ...cached.payload,
        cache: {
          hit: true,
          source: 'local-cache',
          expiresAt: new Date(cached.expiresAt).toISOString(),
        },
      };
    }

    const response = await fetchOpenCnpj(cnpj);
    const dadosCnpj = buildOpenCnpjDossier(response);
    const payload = buildResponse(dadosCnpj, {
      hit: false,
      source: 'api',
      expiresAt: new Date(now + DOSSIER_CACHE_TTL_MS).toISOString(),
    });

    lookupCache.set(cacheKey, {
      expiresAt: now + DOSSIER_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }
}

export { OpenCnpjError };
