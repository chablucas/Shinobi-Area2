
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'

import './styles/shinobi-theme.css'
import './styles/cards.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Une mise à jour de Shinobi Area est disponible.')
  },
  onOfflineReady() {
    console.log('Shinobi Area est prêt pour une utilisation hors ligne.')
  },
})
