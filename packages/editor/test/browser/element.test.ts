import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/index.js';
import type { PhpScriptEditor } from '../../src/index.js';
import { toHexColor } from '../../src/theme.js';
import sample from '../fixtures/sample-config.json';

async function mount(
  attrs: Record<string, string> = {},
  props: Partial<PhpScriptEditor> = {},
  inner = '',
) {
  const el = document.createElement('php-script-editor');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  el.innerHTML = inner;
  document.body.append(el);
  await el.whenReady();
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<php-script-editor>', () => {
  it('renders Monaco with the initial value', async () => {
    const el = await mount({}, { value: 'echo "hi";', config: sample as never });
    expect(el.querySelector('.monaco-editor')).not.toBeNull();
    expect(el.editor?.getValue()).toBe('echo "hi";');
    expect(el.editor?.getModel()?.getLanguageId()).toMatch(/^php-script-/);
  });

  it('reads initial content from a script child', async () => {
    const el = await mount(
      {},
      {},
      '<script type="text/php-script">\nif (a) { echo "</b>"; }</script>',
    );
    expect(el.value).toBe('if (a) { echo "</b>"; }');
  });

  it('emits input and ps-change when the user types', async () => {
    const el = await mount();
    const input = vi.fn();
    const change = vi.fn();
    el.addEventListener('input', input);
    el.addEventListener('ps-change', change);
    el.editor!.trigger('test', 'type', { text: 'echo 1;' });
    expect(el.value).toBe('echo 1;');
    expect(input).toHaveBeenCalledOnce();
    expect(change.mock.calls[0]![0].detail.value).toBe('echo 1;');
    expect(el.status).toBe('dirty');
  });

  it('applies external value changes without echoing events', async () => {
    const el = await mount();
    const input = vi.fn();
    el.addEventListener('input', input);
    el.value = 'echo 2;';
    await el.updateComplete;
    expect(el.editor!.getValue()).toBe('echo 2;');
    expect(input).not.toHaveBeenCalled();
  });

  it('POSTs a new script, then PUTs to the Location', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('{"id":1}', { status: 201, headers: { Location: '/api/scripts/1' } }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const el = await mount({ 'save-url': '/api/scripts', 'csrf-token': 'abc' });
    expect(el.querySelector('.pse-save')).not.toBeNull();

    el.value = 'echo 1;';
    await el.updateComplete;
    await el.save();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/scripts');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'POST' });
    expect(el.status).toBe('saved');
    expect(el.persisted).toBe(true);

    await el.save();
    expect(fetchMock.mock.calls[1]![0]).toBe(new URL('/api/scripts/1', location.href).toString());
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({ content: 'echo 1;' });
  });

  it('uses PUT when initial content exists and honours save-method', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 204 }));
    const el = await mount({ 'save-url': '/x' }, { value: 'echo 1;' });
    await el.save();
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'PUT' });
    el.saveMethod = 'patch';
    await el.save();
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PATCH' });
  });

  it('shows 422 diagnostics as markers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'invalid',
          errors: { content: ['Unexpected token'] },
          diagnostics: [
            { message: 'Unexpected token', line: 1, column: 6, length: 1, severity: 'error' },
          ],
        }),
        { status: 422 },
      ),
    );
    const el = await mount({ 'save-url': '/x' }, { value: 'echo (;' });
    const error = vi.fn();
    el.addEventListener('ps-save-error', error);
    await expect(el.save()).rejects.toThrow('Unexpected token');
    expect(el.status).toBe('error');
    expect(error).toHaveBeenCalledOnce();
    const markers = el.monaco.editor.getModelMarkers({ resource: el.editor!.getModel()!.uri });
    expect(markers[0]).toMatchObject({ startColumn: 6, message: 'Unexpected token' });
  });

  it('a cancelled ps-save-start prevents the request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const el = await mount({ 'save-url': '/x' });
    el.addEventListener('ps-save-start', (e) => e.preventDefault());
    await expect(el.save()).rejects.toThrow('cancelled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('participates in forms', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const el = document.createElement('php-script-editor');
    el.setAttribute('name', 'script');
    el.value = 'echo 3;';
    form.append(el);
    await el.whenReady();
    expect(new FormData(form).get('script')).toBe('echo 3;');
  });

  it('follows the page theme and CSS variables', async () => {
    const el = await mount();
    document.documentElement.classList.add('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.dataset.themeBase).toBe('dark');
    document.documentElement.classList.remove('dark');
    el.style.setProperty('--php-script-editor-background', 'oklch(0.3 0.02 260)');
    el.refreshTheme();
    expect(el.currentTheme?.colors.background).toBe('oklch(0.3 0.02 260)');
    expect(el.dataset.themeBase).toBe('light');
  });

  it('converts oklch colors through the canvas', () => {
    expect(toHexColor('oklch(1 0 0)')).toBe('#ffffff');
    expect(toHexColor('not-a-color')).toBeNull();
  });

  it('suggests context variables and members', async () => {
    const el = await mount({}, { config: sample as never, value: 'user.' });
    const model = el.editor!.getModel()!;
    el.editor!.setPosition({ lineNumber: 1, column: 6 });
    el.editor!.focus();
    el.editor!.trigger('test', 'editor.action.triggerSuggest', {});
    await vi.waitFor(() => {
      const rows = [...el.querySelectorAll('.suggest-widget .monaco-list-row')].map(
        (r) => r.getAttribute('aria-label') ?? '',
      );
      expect(rows.some((r) => r.includes('greet'))).toBe(true);
    });
    expect(model.getValue()).toBe('user.');
  });

  it('recreates the editor after being moved in the DOM', async () => {
    const el = await mount({}, { value: 'echo 1;' });
    const wrapper = document.createElement('div');
    document.body.append(wrapper);
    wrapper.append(el);
    await el.whenReady();
    expect(el.editor?.getValue()).toBe('echo 1;');
    expect(el.querySelectorAll('.monaco-editor')).toHaveLength(1);
  });
});
