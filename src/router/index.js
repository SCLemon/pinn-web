import Vue from 'vue'
import VueRouter from 'vue-router'

import Main from '../pages/Main/Main.vue'
import List from '../pages/List/List.vue'
import Gate from '../pages/Gate/Gate.vue'
Vue.use(VueRouter)
const router = new VueRouter({
    routes:[
        {
            path:'/main',
            component:Main,
        },
        {
            path:'/gate',
            component:Gate
        },
        {
            path:'/list',
            component:List
        },
        {
            path:'/',
            redirect:'/main'
        },
    ]
})
router.beforeEach((to, from, next) => {
    next()
})
export default router