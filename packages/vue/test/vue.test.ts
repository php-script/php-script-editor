import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { PhpScriptEditor } from '../src/index.js';
import type { PhpScriptEditor as El } from '@php-script/editor';

describe('Vue <PhpScriptEditor>', () => {
  it('supports v-model in both directions', async () => {
    const code = ref('echo 1;');
    const onReady = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(PhpScriptEditor, {
            modelValue: code.value,
            'onUpdate:modelValue': (v: string) => (code.value = v),
            onReady,
            theme: 'dark',
            saveUrl: '/api/scripts',
            height: '10rem',
          }),
      }),
      { attachTo: document.body },
    );
    await vi.waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 15_000 });
    const el = wrapper.element as El;
    expect(el.tagName).toBe('PHP-SCRIPT-EDITOR');
    expect(el.saveUrl).toBe('/api/scripts');
    expect(el.editor!.getValue()).toBe('echo 1;');

    el.editor!.trigger('t', 'type', { text: 'x' });
    expect(code.value).toBe('xecho 1;');

    code.value = 'echo 2;';
    await nextTick();
    await vi.waitFor(() => expect(el.editor!.getValue()).toBe('echo 2;'));
    wrapper.unmount();
  });
});
