<script lang="ts">
  import { PhpScriptEditor } from '@php-script/editor-svelte';
  import { SAMPLE, runScript } from './chrome.js';

  let code = $state(SAMPLE);
  let output = $state('');
  let status = $state('');
</script>

<main>
  <section class="card">
    <h2>Svelte 5 (bind:value)</h2>
    <PhpScriptEditor
      bind:value={code}
      configUrl="/api/config"
      saveUrl="/api/scripts"
      persisted={false}
      height="18rem"
      onsaved={(r) => (status = `${r.method} ${r.url} -> ${r.status}`)}
      onsaveerror={(e) => (status = `error: ${e.message}`)}
    />
    <p>
      <button type="button" data-testid="run" onclick={async () => (output = await runScript(code))}
        >Run</button
      >
    </p>
    <pre data-testid="status">{status}</pre>
    <pre data-testid="output">{output}</pre>
    <pre data-testid="mirror">{code}</pre>
  </section>
</main>
