// For svelte-check, which does not understand .vue files. vue-tsc uses the real component types.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
