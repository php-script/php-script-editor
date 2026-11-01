import type { LintDiagnostic, SaveMethod } from './types.js';

export interface SaveRequest {
  url: string;
  method: SaveMethod;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface SaveResult {
  url: string;
  method: SaveMethod;
  status: number;
  data: unknown;
  /** Where the next save goes (taken from `Location` or a `url` field after a POST). */
  nextUrl: string;
}

export class SaveError extends Error {
  override name = 'SaveError';
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown,
    readonly diagnostics: LintDiagnostic[] = [],
  ) {
    super(message);
  }
}

export interface SaveOptions {
  url: string;
  /** Explicit method. When empty: POST for new scripts, PUT once the script exists. */
  method?: SaveMethod | null;
  persisted: boolean;
  field: string;
  content: string;
  payload?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
  csrfToken?: string | null;
  fetch?: typeof fetch;
}

/** Method used when the caller does not set one. */
export function resolveSaveMethod(
  method: SaveMethod | null | undefined,
  persisted: boolean,
): SaveMethod {
  const explicit = (method ?? '').trim().toUpperCase();
  if (explicit) return explicit;
  return persisted ? 'PUT' : 'POST';
}

/** CSRF token from `<meta name="csrf-token">` (Laravel default) when none is given. */
export function findCsrfToken(doc: Document | undefined = globalThis.document): string | null {
  return doc?.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || null;
}

export function buildSaveRequest(options: SaveOptions): SaveRequest {
  const method = resolveSaveMethod(options.method, options.persisted);
  const csrf = options.csrfToken ?? findCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
    ...options.headers,
  };
  return {
    url: options.url,
    method,
    headers,
    body: { ...options.payload, [options.field]: options.content },
  };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Pulls diagnostics out of an error body: `{ diagnostics: [...] }` or a bare array. */
export function extractDiagnostics(data: unknown): LintDiagnostic[] {
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { diagnostics?: unknown }).diagnostics)
      ? (data as { diagnostics: unknown[] }).diagnostics
      : [];
  return list.filter(
    (d): d is LintDiagnostic =>
      typeof d === 'object' && d !== null && 'message' in d && 'line' in d && 'column' in d,
  );
}

function errorMessage(data: unknown, field: string, status: number): string {
  if (typeof data === 'object' && data !== null) {
    const body = data as { message?: unknown; errors?: Record<string, unknown> };
    const fieldErrors = body.errors?.[field];
    if (Array.isArray(fieldErrors) && typeof fieldErrors[0] === 'string') return fieldErrors[0];
    if (typeof body.message === 'string' && body.message) return body.message;
  }
  return `Save failed (HTTP ${status})`;
}

function nextUrlFrom(response: Response, data: unknown, request: SaveRequest): string {
  const fromBody =
    typeof data === 'object' && data !== null
      ? ((data as { url?: unknown; location?: unknown }).url ??
        (data as { location?: unknown }).location)
      : undefined;
  const location =
    response.headers.get('Location') ?? (typeof fromBody === 'string' ? fromBody : null);
  if (!location || request.method !== 'POST') return request.url;
  try {
    return new URL(
      location,
      new URL(request.url, globalThis.location?.href ?? 'http://localhost'),
    ).toString();
  } catch {
    return request.url;
  }
}

export async function sendSave(
  request: SaveRequest,
  options: Pick<SaveOptions, 'field' | 'fetch'>,
): Promise<SaveResult> {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const response = await doFetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body),
    credentials: 'same-origin',
  });
  const data = await readBody(response);

  if (!response.ok) {
    throw new SaveError(
      errorMessage(data, options.field, response.status),
      response.status,
      data,
      extractDiagnostics(data),
    );
  }

  return {
    url: request.url,
    method: request.method,
    status: response.status,
    data,
    nextUrl: nextUrlFrom(response, data, request),
  };
}

/** POSTs the script to a lint endpoint and returns its diagnostics. */
export async function requestLint(
  url: string,
  content: string,
  options: {
    field: string;
    csrfToken?: string | null;
    headers?: Record<string, string> | null;
    fetch?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<LintDiagnostic[]> {
  const request = buildSaveRequest({
    url,
    method: 'POST',
    persisted: false,
    field: options.field,
    content,
    csrfToken: options.csrfToken ?? null,
    headers: options.headers ?? null,
  });
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const response = await doFetch(url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    credentials: 'same-origin',
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const data = await readBody(response);
  if (!response.ok && response.status !== 422)
    throw new SaveError(`Lint failed (HTTP ${response.status})`, response.status, data);
  return extractDiagnostics(data);
}
