import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './index.css'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

await new Promise(resolve => setTimeout(resolve, 100));
window.__vscodeApi__?.postMessage({ type: 'onWebviewReady' })
