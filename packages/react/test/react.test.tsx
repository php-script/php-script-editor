import { act, render, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhpScriptEditor, type PhpScriptEditorHandle } from '../src/index.js';

describe('React <PhpScriptEditor>', () => {
  it('mounts, syncs props and reports changes', async () => {
    const onChange = vi.fn();
    const onReady = vi.fn();
    const ref = createRef<PhpScriptEditorHandle>();
    render(
      <PhpScriptEditor
        ref={ref}
        defaultValue="echo 1;"
        theme="dark"
        height="12rem"
        saveUrl="/api/scripts"
        onChange={onChange}
        onReady={onReady}
      />,
    );
    await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 15_000 });
    const el = ref.current!.element!;
    expect(el.saveUrl).toBe('/api/scripts');
    expect(el.dataset.themeBase).toBe('dark');
    expect(el.style.getPropertyValue('--php-script-editor-height')).toBe('12rem');
    expect(ref.current!.editor!.getValue()).toBe('echo 1;');
    act(() => ref.current!.editor!.trigger('t', 'type', { text: 'x' }));
    expect(onChange).toHaveBeenCalledWith('xecho 1;');
  });

  it('works as controlled component', async () => {
    let setter!: (v: string) => void;
    const ref = createRef<PhpScriptEditorHandle>();
    function App() {
      const [value, setValue] = useState('a');
      setter = setValue;
      return <PhpScriptEditor ref={ref} value={value} onChange={setValue} />;
    }
    render(<App />);
    await waitFor(() => expect(ref.current?.editor).toBeTruthy(), { timeout: 15_000 });
    act(() => setter('echo "b";'));
    await waitFor(() => expect(ref.current!.editor!.getValue()).toBe('echo "b";'));
  });
});
