import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './index.css'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

window.__vscodeApi__?.postMessage({ type: 'onWebviewReady' })

window.addEventListener('message', (event) => {
  if (event.data?.type === 'checkReady') {
    window.__vscodeApi__?.postMessage({ type: 'onWebviewReady' })
  }
})
