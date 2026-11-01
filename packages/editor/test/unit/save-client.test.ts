import { describe, expect, it, vi } from 'vitest';
import {
  SaveError,
  buildSaveRequest,
  extractDiagnostics,
  requestLint,
  resolveSaveMethod,
  sendSave,
} from '../../src/save-client.js';

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('resolveSaveMethod', () => {
  it('uses POST for new and PUT for persisted scripts', () => {
    expect(resolveSaveMethod(null, false)).toBe('POST');
    expect(resolveSaveMethod(undefined, true)).toBe('PUT');
  });
  it('honours an explicit method', () => {
    expect(resolveSaveMethod('patch', true)).toBe('PATCH');
    expect(resolveSaveMethod(' ', false)).toBe('POST');
  });
});

describe('buildSaveRequest', () => {
  it('builds a JSON request with CSRF from the meta tag', () => {
    document.head.innerHTML = '<meta name="csrf-token" content="tok">';
    const request = buildSaveRequest({
      url: '/scripts',
      persisted: false,
      field: 'code',
      content: 'echo 1;',
      payload: { name: 'x' },
      headers: { 'X-Extra': '1' },
    });
    expect(request).toMatchObject({
      method: 'POST',
      body: { name: 'x', code: 'echo 1;' },
      headers: { 'X-CSRF-TOKEN': 'tok', 'X-Extra': '1', Accept: 'application/json' },
    });
    document.head.innerHTML = '';
  });

  it('content wins over payload', () => {
    const request = buildSaveRequest({
      url: '/',
      persisted: true,
      field: 'content',
      content: 'a',
      payload: { content: 'b' },
    });
    expect(request.body.content).toBe('a');
  });
});

describe('sendSave', () => {
  const request = buildSaveRequest({
    url: 'http://app.test/scripts',
    persisted: false,
    field: 'content',
    content: 'x',
    csrfToken: '',
  });

  it('returns the Location of a created script as nextUrl', async () => {
    const fetch = vi.fn(async () => jsonResponse(201, { id: 7 }, { Location: '/scripts/7' }));
    const result = await sendSave(request, { field: 'content', fetch });
    expect(result.nextUrl).toBe('http://app.test/scripts/7');
    expect(fetch).toHaveBeenCalledWith(
      'http://app.test/scripts',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to a url in the body', async () => {
    const fetch = vi.fn(async () => jsonResponse(201, { url: '/scripts/8' }));
    expect((await sendSave(request, { field: 'content', fetch })).nextUrl).toBe(
      'http://app.test/scripts/8',
    );
  });

  it('keeps the url for PUT', async () => {
    const put = { ...request, method: 'PUT' };
    const fetch = vi.fn(async () => jsonResponse(200, null, { Location: '/other' }));
    expect((await sendSave(put, { field: 'content', fetch })).nextUrl).toBe(request.url);
  });

  it('throws SaveError with Laravel validation message and diagnostics', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(422, {
        message: 'The given data was invalid.',
        errors: { content: ['Unexpected token'] },
        diagnostics: [{ message: 'Unexpected token', line: 1, column: 3 }],
      }),
    );
    const error = await sendSave(request, { field: 'content', fetch }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SaveError);
    expect(error).toMatchObject({ message: 'Unexpected token', status: 422 });
    expect((error as SaveError).diagnostics).toHaveLength(1);
  });

  it('reports plain HTTP errors', async () => {
    const fetch = vi.fn(async () => new Response('boom', { status: 500 }));
    await expect(sendSave(request, { field: 'content', fetch })).rejects.toThrow(
      'Save failed (HTTP 500)',
    );
  });
});

describe('diagnostics', () => {
  it('extracts valid entries only', () => {
    expect(extractDiagnostics([{ message: 'a', line: 1, column: 1 }, { nope: true }])).toHaveLength(
      1,
    );
    expect(extractDiagnostics({ diagnostics: [] })).toEqual([]);
    expect(extractDiagnostics('x')).toEqual([]);
  });

  it('requestLint accepts 422 bodies', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse(422, { diagnostics: [{ message: 'x', line: 2, column: 1 }] }),
    );
    expect(
      await requestLint('/lint', 'code', { field: 'content', csrfToken: '', fetch }),
    ).toHaveLength(1);
  });
});
