import type { PhpScriptEditor } from '@php-script/editor';
import type { HTMLAttributes } from 'svelte/elements';

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
    'php-script-editor': HTMLAttributes<PhpScriptEditor>;
  }
}
export {};
