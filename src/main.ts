import './styles/global.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { i18n } from '@/i18n'

import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')
