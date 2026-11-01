import '@php-script/editor';
import type { PhpScriptEditor } from '@php-script/editor';
import { SAMPLE, renderChrome, runScript } from './chrome.js';

renderChrome('vanilla');

const editor = document.querySelector<PhpScriptEditor>('[data-testid=editor]')!;
const log = document.querySelector('[data-testid=log]')!;
editor.value = SAMPLE;
editor.persisted = false;

for (const type of ['ps-saved', 'ps-save-error', 'ps-diagnostics'] as const) {
  editor.addEventListener(type, (event) => {
    const { detail } = event as CustomEvent<Record<string, unknown>>;
    const summary =
      type === 'ps-saved'
        ? `${detail.method} ${detail.url} -> ${detail.status}`
        : JSON.stringify(detail);
    log.textContent = `${type}: ${summary}\n${log.textContent}`.slice(0, 2000);
  });
}

document.querySelector('[data-testid=run]')!.addEventListener('click', async () => {
  log.textContent = `run: ${await runScript(editor.value)}\n${log.textContent}`;
});

document.querySelector('[data-testid=form]')!.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target as HTMLFormElement);
  document.querySelector('[data-testid=form-output]')!.textContent = `script=${data.get('script')}`;
});
