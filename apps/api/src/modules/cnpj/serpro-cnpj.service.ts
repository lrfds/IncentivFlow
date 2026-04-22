import { createHash } from 'node:crypto';
import { IncentiveEngine, type NormalizedCnpjDossier } from './incentive-engine.js';
import { buildNormalizedDossier } from './serpro.mapper.js';
import {
  SerproBasicaResponseSchema,
  SerproEmpresaResponseSchema,
  SerproQsaResponseSchema,
  type SerproBasicaResponse,
  type SerproEmpresaResponse,
  type SerproQsaResponse,
} from './serpro.schemas.js';

const DOSSIER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.SERPRO_TIMEOUT_MS || 12_000);
const MAX_RATE_LIMIT_RETRIES = 3;

type EndpointKind = 'basica' | 'qsa' | 'empresa';
type SerproEnv = 'homologacao' | 'producao';
type CacheSource = 'api' | 'local-cache';

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

interface LookupPayload {
  dadosCnpj: NormalizedCnpjDossier;
  analiseIncentivos: ReturnType<typeof IncentiveEngine.analyze>;
  consultadoEm: string;
  cache: {
    hit: boolean;
    source: CacheSource;
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

interface ServiceConfig {
  env: SerproEnv;
  tokenUrl: string;
  endpoints: Record<EndpointKind, string>;
}

class SerproIntegrationError extends Error {
  code: string;
  statusCode?: number;
  details?: unknown;

  constructor(code: string, options?: { statusCode?: number; details?: unknown }) {
    super(code);
    this.name = 'SerproIntegrationError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}

class EntityNotFoundError extends SerproIntegrationError {
  constructor(details?: unknown) {
    super('SERPRO_CNPJ_NOT_FOUND', { statusCode: 404, details });
    this.name = 'EntityNotFoundError';
  }
}

class CriticalCredentialError extends SerproIntegrationError {
  constructor(details?: unknown) {
    super('SERPRO_AUTH_FAILED', { statusCode: 401, details });
    this.name = 'CriticalCredentialError';
  }
}

class RateLimitError extends SerproIntegrationError {
  constructor(details?: unknown) {
    super('SERPRO_RATE_LIMIT', { statusCode: 429, details });
    this.name = 'RateLimitError';
  }
}

class SchemaMismatchError extends SerproIntegrationError {
  constructor(details?: unknown) {
    super('SERPRO_SCHEMA_MISMATCH', { statusCode: 502, details });
    this.name = 'SchemaMismatchError';
  }
}

class UpstreamError extends SerproIntegrationError {
  constructor(statusCode: number, details?: unknown) {
    super('SERPRO_UPSTREAM_ERROR', { statusCode, details });
    this.name = 'UpstreamError';
  }
}

const tokenState: TokenState = {
  accessToken: '',
  expiresAt: 0,
};

const lookupCache = new Map<string, CacheEntry>();

function logOperationalEvent(level: 'warn' | 'error', message: string, details?: Record<string, unknown>) {
  const payload = {
    message,
    ...(details || {}),
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error('[SERPRO]', payload);
    return;
  }

  console.warn('[SERPRO]', payload);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function resolveCredential(name: 'clientId' | 'clientSecret'): string {
  if (name === 'clientId') {
    return process.env.SERPRO_CLIENT_ID || process.env.SERPRO_CONSUMER_KEY || '';
  }

  return process.env.SERPRO_CLIENT_SECRET || process.env.SERPRO_CONSUMER_SECRET || '';
}

function hasCredentials(): boolean {
  return Boolean(resolveCredential('clientId') && resolveCredential('clientSecret'));
}

function resolveEnvironment(): SerproEnv {
  const raw = (process.env.SERPRO_ENV || 'homologacao').toLowerCase();
  return raw === 'producao' ? 'producao' : 'homologacao';
}

function resolveGatewayBase(env: SerproEnv): string {
  if (env === 'producao') {
    return process.env.SERPRO_GATEWAY_URL_PRODUCAO
      || process.env.SERPRO_GATEWAY_URL
      || 'https://gateway.apiserpro.serpro.gov.br';
  }

  return process.env.SERPRO_GATEWAY_URL_HOMOLOGACAO
    || process.env.SERPRO_GATEWAY_URL
    || 'https://gateway.apiserpro.serpro.gov.br';
}

function getServiceConfig(): ServiceConfig {
  const env = resolveEnvironment();
  const gatewayBase = resolveGatewayBase(env);

  return {
    env,
    tokenUrl: process.env.SERPRO_TOKEN_URL || `${gatewayBase}/token`,
    endpoints: {
      basica: process.env.SERPRO_CNPJ_BASICA_URL || `${gatewayBase}/api-cnpj-basica/v2/basica`,
      qsa: process.env.SERPRO_CNPJ_QSA_URL || `${gatewayBase}/api-cnpj-qsa/v2/qsa`,
      empresa: process.env.SERPRO_CNPJ_EMPRESA_URL || `${gatewayBase}/api-cnpj-empresa/v2/empresa`,
    },
  };
}

function buildBasicAuth(): string {
  const clientId = resolveCredential('clientId');
  const clientSecret = resolveCredential('clientSecret');

  if (!clientId || !clientSecret) {
    throw new SerproIntegrationError('SERPRO_NOT_CONFIGURED');
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeout),
  };
}

async function getResponseBodyText(response: Response): Promise<string> {
  return response.text().catch(() => '');
}

function mapHttpError(status: number, bodyText: string): never {
  const normalizedBody = bodyText.toLowerCase();

  if (status === 401 || status === 403) {
    logOperationalEvent('error', 'Falha crítica nas credenciais SERPRO', { status, bodyText });
    throw new CriticalCredentialError({ status, bodyText });
  }

  if (
    status === 404
    || normalizedBody.includes('não encontrado')
    || normalizedBody.includes('nao encontrado')
    || normalizedBody.includes('cnpj inexistente')
    || normalizedBody.includes('not found')
  ) {
    throw new EntityNotFoundError({ status, bodyText });
  }

  if (status === 429) {
    throw new RateLimitError({ status, bodyText });
  }

  throw new UpstreamError(status, { bodyText });
}

function validateSchema<T>(kind: EndpointKind, payload: unknown, parser: { safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown } }): T {
  const result = parser.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  logOperationalEvent('error', 'Schema mismatch no payload SERPRO', {
    endpoint: kind,
    issues: result.error,
  });

  throw new SchemaMismatchError({ endpoint: kind, issues: result.error });
}

function buildResponse(
  dadosCnpj: NormalizedCnpjDossier,
  cache: { hit: boolean; source: CacheSource; expiresAt?: string; stale?: boolean; staleReason?: string },
  warnings: string[] = [],
): LookupPayload {
  return {
    dadosCnpj,
    analiseIncentivos: IncentiveEngine.analyze(dadosCnpj),
    consultadoEm: new Date().toISOString(),
    cache,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

async function getAccessToken(): Promise<string> {
  if (!hasCredentials()) {
    throw new SerproIntegrationError('SERPRO_NOT_CONFIGURED');
  }

  const now = Date.now();
  if (tokenState.accessToken && tokenState.expiresAt > now + 60_000) {
    return tokenState.accessToken;
  }

  const { tokenUrl, env } = getServiceConfig();
  const timeout = withTimeout();

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${buildBasicAuth()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
      signal: timeout.signal,
    });

    if (!response.ok) {
      const bodyText = await getResponseBodyText(response);
      mapHttpError(response.status, bodyText);
    }

    const json = await response.json() as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      throw new CriticalCredentialError({ env, reason: 'missing_access_token' });
    }

    tokenState.accessToken = json.access_token;
    tokenState.expiresAt = now + Math.min((json.expires_in || 3600) * 1000, TOKEN_CACHE_TTL_MS);
    return tokenState.accessToken;
  } finally {
    timeout.dispose();
  }
}

async function fetchEndpoint<T>(endpoint: EndpointKind, cnpj: string): Promise<T> {
  const token = await getAccessToken();
  const { endpoints, env } = getServiceConfig();

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const timeout = withTimeout();

    try {
      const response = await fetch(`${endpoints[endpoint]}/${cnpj}`, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: timeout.signal,
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      const bodyText = await getResponseBodyText(response);

      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryInMs = 400 * 2 ** attempt + Math.floor(Math.random() * 150);
        logOperationalEvent('warn', 'Rate limit no SERPRO, iniciando backoff exponencial', {
          endpoint,
          env,
          attempt: attempt + 1,
          retryInMs,
        });
        await wait(retryInMs);
        continue;
      }

      mapHttpError(response.status, bodyText);
    } catch (error) {
      if (error instanceof SerproIntegrationError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UpstreamError(504, { endpoint, reason: 'timeout' });
      }

      throw new UpstreamError(502, {
        endpoint,
        reason: error instanceof Error ? error.message : 'unknown_network_error',
      });
    } finally {
      timeout.dispose();
    }
  }

  throw new RateLimitError({ endpoint, retries: MAX_RATE_LIMIT_RETRIES });
}

async function fetchOptionalQsa(cnpj: string): Promise<{ qsa: SerproQsaResponse; warnings: string[] }> {
  try {
    const qsaRaw = await fetchEndpoint<unknown>('qsa', cnpj);
    const qsa = validateSchema('qsa', qsaRaw, SerproQsaResponseSchema);
    return { qsa, warnings: [] };
  } catch (error) {
    if (
      error instanceof EntityNotFoundError
      || error instanceof SchemaMismatchError
      || error instanceof RateLimitError
      || error instanceof UpstreamError
    ) {
      logOperationalEvent('warn', 'QSA indisponível; seguindo com dossiê parcial', {
        cnpj,
        error: error.code,
      });
      return {
        qsa: [],
        warnings: ['Quadro societário indisponível no momento. O dossiê foi consolidado com os demais dados oficiais.'],
      };
    }

    throw error;
  }
}

export class SerproCnpjService {
  static isConfigured(): boolean {
    return hasCredentials();
  }

  static getRuntimeMode(): 'production' | 'demo' {
    return this.isConfigured() ? 'production' : 'demo';
  }

  static getCacheKey(cnpj: string, organizationId?: string): string {
    return createHash('sha256').update(`${organizationId || 'public'}:${onlyDigits(cnpj)}`).digest('hex');
  }

  static async lookup(cnpjInput: string, options?: { organizationId?: string; requestedBy?: string }): Promise<LookupPayload> {
    const cnpj = onlyDigits(cnpjInput);
    if (cnpj.length !== 14) {
      throw new SerproIntegrationError('INVALID_CNPJ');
    }

    if (!this.isConfigured()) {
      throw new SerproIntegrationError('SERPRO_NOT_CONFIGURED');
    }

    const cacheKey = this.getCacheKey(cnpj, options?.organizationId);
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

    const [basicaRaw, empresaRaw, optionalQsa] = await Promise.all([
      fetchEndpoint<unknown>('basica', cnpj),
      fetchEndpoint<unknown>('empresa', cnpj),
      fetchOptionalQsa(cnpj),
    ]);

    const basica = validateSchema<SerproBasicaResponse>('basica', basicaRaw, SerproBasicaResponseSchema);
    const empresa = validateSchema<SerproEmpresaResponse>('empresa', empresaRaw, SerproEmpresaResponseSchema);

    const dadosCnpj = buildNormalizedDossier({
      cnpj,
      basica,
      empresa,
      qsa: optionalQsa.qsa,
    });

    const payload = buildResponse(
      dadosCnpj,
      {
        hit: false,
        source: 'api',
        expiresAt: new Date(now + DOSSIER_CACHE_TTL_MS).toISOString(),
      },
      optionalQsa.warnings,
    );

    lookupCache.set(cacheKey, {
      expiresAt: now + DOSSIER_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }
}
