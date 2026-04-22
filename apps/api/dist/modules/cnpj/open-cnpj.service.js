import { createHash } from 'node:crypto';
import { IncentiveEngine } from './incentive-engine.js';
import { buildOpenCnpjDossier } from './open-cnpj.mapper.js';
import { OpenCnpjResponseSchema } from '@incentivflow/shared';
const DOSSIER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.OPENCNPJ_TIMEOUT_MS || 10_000);
const HEALTH_CHECK_TIMEOUT_MS = Number(process.env.OPENCNPJ_HEALTH_TIMEOUT_MS || 8_000);
const OPEN_CNPJ_BASE_URL = (process.env.OPENCNPJ_BASE_URL || 'https://api.opencnpj.org').replace(/\/+$/, '');
const OPEN_CNPJ_DATASETS = process.env.OPENCNPJ_DATASETS || 'receita';
const OPEN_CNPJ_HEALTH_CNPJ = (process.env.OPENCNPJ_HEALTH_CNPJ || '17283532000186').replace(/\D/g, '');
const ALLOW_INVALID_TLS = process.env.OPENCNPJ_ALLOW_INVALID_TLS === 'true';
class OpenCnpjError extends Error {
    code;
    statusCode;
    constructor(code, statusCode) {
        super(code);
        this.name = 'OpenCnpjError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
const lookupCache = new Map();
function onlyDigits(value) {
    return value.replace(/\D/g, '');
}
function configureTlsForOpenCnpj() {
    if (ALLOW_INVALID_TLS && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
}
function withTimeout(timeoutMs = REQUEST_TIMEOUT_MS, signal) {
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
function getCacheKey(cnpj, organizationId) {
    return createHash('sha256').update(`${organizationId || 'public'}:${onlyDigits(cnpj)}`).digest('hex');
}
function buildOpenCnpjUrl(cnpj, datasets = OPEN_CNPJ_DATASETS) {
    const url = new URL(`${OPEN_CNPJ_BASE_URL}/${onlyDigits(cnpj)}`);
    if (datasets) {
        url.searchParams.set('datasets', datasets);
    }
    return url.toString();
}
function validatePayload(payload) {
    const parsed = OpenCnpjResponseSchema.safeParse(payload);
    if (!parsed.success) {
        console.error('[OpenCNPJ] schema mismatch', parsed.error.flatten());
        throw new OpenCnpjError('OPENCNPJ_SCHEMA_MISMATCH', 502);
    }
    return parsed.data;
}
function buildResponse(dadosCnpj, cache) {
    return {
        dadosCnpj,
        analiseIncentivos: IncentiveEngine.analyze(dadosCnpj),
        consultadoEm: new Date().toISOString(),
        cache,
    };
}
async function fetchOpenCnpj(cnpj) {
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
        const json = await response.json();
        return validatePayload(json);
    }
    catch (error) {
        if (error instanceof OpenCnpjError)
            throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new OpenCnpjError('OPENCNPJ_TIMEOUT', 504);
        }
        throw new OpenCnpjError('OPENCNPJ_NETWORK_ERROR', 502);
    }
    finally {
        timeout.dispose();
    }
}
export class OpenCnpjService {
    static getRuntimeMode() {
        return 'production';
    }
    static getProviderName() {
        return 'OpenCNPJ';
    }
    static getCacheKey(cnpj, organizationId) {
        return getCacheKey(cnpj, organizationId);
    }
    static async getStatus() {
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
        }
        catch (error) {
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
        }
        finally {
            timeout.dispose();
        }
    }
    static async lookup(cnpjInput, options) {
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
