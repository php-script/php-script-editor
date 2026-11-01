<script lang="ts">
  import PhpScriptEditor from '../src/PhpScriptEditor.svelte';
  import type { PhpScriptEditor as El } from '@php-script/editor';

  let { onready }: { onready: () => void } = $props();
  let value = $state('echo 1;');
  let element = $state<El | null>(null);
  export const api = {
    get value() {
      return value;
    },
    set value(v: string) {
      value = v;
    },
    get element() {
      return element;
    },
  };
</script>

<PhpScriptEditor
  bind:value
  bind:element
  theme="dark"
  saveUrl="/api/scripts"
  height="10rem"
  {onready}
/>
