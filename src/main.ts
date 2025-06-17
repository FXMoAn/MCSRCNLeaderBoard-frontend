import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 配置element-plus
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus,{
    locale:zhCn,
})

// 配置svg图标
import 'virtual:svg-icons-register'
app.mount('#app')
