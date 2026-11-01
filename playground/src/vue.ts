import { createApp } from 'vue';
import VueApp from './VueApp.vue';
import { renderChrome } from './chrome.js';

renderChrome('vue');
createApp(VueApp).mount('#app');
