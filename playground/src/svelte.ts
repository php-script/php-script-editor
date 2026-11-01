import { mount } from 'svelte';
import SvelteApp from './SvelteApp.svelte';
import { renderChrome } from './chrome.js';

renderChrome('svelte');
mount(SvelteApp, { target: document.getElementById('app')! });
