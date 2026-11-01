import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Harness from './Harness.svelte';

describe('Svelte <PhpScriptEditor>', () => {
  it('supports bind:value both ways and sets props', async () => {
    const onready = vi.fn();
    const { component } = render(Harness, { onready });
    await vi.waitFor(() => expect(onready).toHaveBeenCalled(), { timeout: 15_000 });
    const { api } = component as unknown as {
      api: { value: string; element: import('@php-script/editor').PhpScriptEditor };
    };
    const el = api.element;
    expect(el.saveUrl).toBe('/api/scripts');
    expect(el.dataset.themeBase).toBe('dark');
    expect(el.editor!.getValue()).toBe('echo 1;');

    el.editor!.trigger('t', 'type', { text: 'x' });
    expect(api.value).toBe('xecho 1;');

    api.value = 'echo 2;';
    flushSync();
    await vi.waitFor(() => expect(el.editor!.getValue()).toBe('echo 2;'));
  });
});
