import { vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

/** Installs a `fetch` mock for the test and returns it. Restored by `vi.unstubAllGlobals()`. */
export function mockFetch(): FetchMock {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', mock);
  return mock;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

export function serverError(message: string, status = 500): Response {
  return jsonResponse({ statusCode: status, error: 'Internal Server Error', message }, { status });
}

/** A promise that never settles — the request is "in flight" for the whole test. */
export function pending(): Promise<Response> {
  return new Promise(() => {});
}
