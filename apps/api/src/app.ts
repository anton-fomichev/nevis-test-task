import Fastify, { type FastifyInstance } from 'fastify';

import { loadClientsReport } from './data/report.js';

export interface BuildAppOptions {
  /** `NODE_ENV`; the dev-only query flags are ignored when it is `"production"`. */
  env?: string | undefined;
  /** Fastify logger option. Off by default so tests stay quiet. */
  logger?: boolean;
}

/** Upper bound for `?delay=` so a typo cannot park a request for an hour. */
const MAX_DELAY_MS = 30_000;

interface ClientsQuery {
  delay?: string;
  fail?: string;
}

/**
 * Creates the API without starting it. `server.ts` listens; tests use `app.inject()`.
 *
 * Routes:
 * - `GET /api/health`  → `{ status: "ok" }`
 * - `GET /api/clients` → `ClientsReport` (`{ months, company }`)
 *
 * Dev-only flags on `/api/clients` (ignored in production):
 * - `?delay=<ms>` waits before answering, to demo the loading state.
 * - `?fail=1` answers 500, to demo the error state.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const env = options.env ?? process.env.NODE_ENV ?? 'development';
  const devFlagsEnabled = env !== 'production';
  const report = loadClientsReport();

  const app = Fastify({ logger: options.logger ?? false });

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.get<{ Querystring: ClientsQuery }>('/api/clients', async (request, reply) => {
    if (devFlagsEnabled) {
      const delay = parseDelay(request.query.delay);
      if (delay > 0) await sleep(delay);
      if (request.query.fail === '1') {
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Simulated failure requested with ?fail=1',
        });
      }
    }
    return report;
  });

  return app;
}

function parseDelay(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(Math.trunc(ms), MAX_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
