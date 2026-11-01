<script setup lang="ts">
import { ref } from 'vue';
import { PhpScriptEditor } from '@php-script/editor-vue';
import { SAMPLE, runScript } from './chrome.js';

const code = ref(SAMPLE);
const output = ref('');
const status = ref('');
const theme = ref<'auto' | 'light' | 'dark'>('auto');
</script>

<template>
  <main>
    <section class="card">
      <h2>Vue (v-model)</h2>
      <label>
        Theme
        <select v-model="theme" data-testid="theme">
          <option value="auto">auto</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </label>
      <PhpScriptEditor
        v-model="code"
        config-url="/api/config"
        save-url="/api/scripts"
        :persisted="false"
        :theme="theme"
        height="18rem"
        @saved="(r) => (status = `${r.method} ${r.url} -> ${r.status}`)"
        @save-error="(e) => (status = `error: ${e.message}`)"
      />
      <p>
        <button type="button" data-testid="run" @click="runScript(code).then((o) => (output = o))">
          Run
        </button>
      </p>
      <pre data-testid="status">{{ status }}</pre>
      <pre data-testid="output">{{ output }}</pre>
      <pre data-testid="mirror">{{ code }}</pre>
    </section>
  </main>
</template>
