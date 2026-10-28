import { clientsReportSchema, type ClientsReport } from '@nevis/contracts';

/** Error thrown by `fetchClientsReport`; `message` is safe to show to the user as-is. */
export class ClientsReportError extends Error {
  override name = 'ClientsReportError';
}

/**
 * `GET /api/clients[flags]`, parsed through the shared contract. Any failure (network, non-2xx,
 * invalid JSON, shape mismatch) becomes a `ClientsReportError` with a readable message.
 */
export async function fetchClientsReport(
  flags = '',
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ClientsReport> {
  let response: Response;
  try {
    response = await fetchImpl(`/api/clients${flags}`, {
      headers: { accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    throw new ClientsReportError(`Could not reach the API (${describe(cause)}).`, { cause });
  }

  if (!response.ok) {
    throw new ClientsReportError(
      `The API answered ${response.status}: ${await serverMessage(response)}.`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new ClientsReportError('The API answered with something that is not JSON.', { cause });
  }

  const parsed = clientsReportSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join(' › ')}` : '';
    throw new ClientsReportError(
      `The API answered with data in an unexpected shape${where}: ${issue?.message ?? 'unknown issue'}.`,
    );
  }
  return parsed.data;
}

async function serverMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }
  } catch {
    // not JSON — fall through
  }
  return response.statusText || 'no details';
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
