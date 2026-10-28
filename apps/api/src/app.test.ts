import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { clientsReportSchema } from '@nevis/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import clients from './data/clients.json' with { type: 'json' };

const apps: ReturnType<typeof buildApp>[] = [];
function app(env?: string) {
  const instance = buildApp({ env });
  apps.push(instance);
  return instance;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('GET /api/health', () => {
  it('answers ok', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /api/clients', () => {
  it('returns months + the company tree and satisfies the contract', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/clients' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const body = clientsReportSchema.parse(res.json());
    expect(body.months).toHaveLength(12);
    expect(body.months[0]).toBe('2024-02');
    expect(body.months[11]).toBe('2025-01');
  });

  it("serves the brief's payload unchanged", async () => {
    const res = await app().inject({ method: 'GET', url: '/api/clients' });
    expect(res.json().company).toEqual(clients);
  });

  it('keeps clients.json byte-for-byte equal to the JSON block in docs/BRIEF.md', () => {
    const brief = readFileSync(
      fileURLToPath(new URL('../../../docs/BRIEF.md', import.meta.url)),
      'utf8',
    );
    const start = brief.indexOf('```json\n') + '```json\n'.length;
    const end = brief.indexOf('\n```', start);
    const fromBrief = brief.slice(start, end) + '\n';
    const fromFile = readFileSync(
      fileURLToPath(new URL('./data/clients.json', import.meta.url)),
      'utf8',
    );
    expect(fromFile).toBe(fromBrief);
  });

  it('fails with 500 when asked to (?fail=1)', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/clients?fail=1' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ message: 'Simulated failure requested with ?fail=1' });
  });

  it('waits for ?delay=<ms> before answering', async () => {
    const started = performance.now();
    const res = await app().inject({ method: 'GET', url: '/api/clients?delay=200' });
    expect(res.statusCode).toBe(200);
    expect(performance.now() - started).toBeGreaterThanOrEqual(190);
  });

  it('ignores a delay that is not a positive number', async () => {
    const started = performance.now();
    for (const delay of ['abc', '-500', 'Infinity']) {
      const res = await app().inject({ method: 'GET', url: `/api/clients?delay=${delay}` });
      expect(res.statusCode).toBe(200);
    }
    expect(performance.now() - started).toBeLessThan(150);
  });

  it('ignores both flags in production', async () => {
    const started = performance.now();
    const res = await app('production').inject({
      method: 'GET',
      url: '/api/clients?fail=1&delay=1000',
    });
    expect(res.statusCode).toBe(200);
    expect(performance.now() - started).toBeLessThan(500);
    expect(res.json().company).toEqual(clients);
  });

  it('404s on unknown routes', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
  });
});
