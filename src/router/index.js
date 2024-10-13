import Vue from 'vue'
import VueRouter from 'vue-router'
import jsCookie from 'js-cookie'

import Main from '../pages/Main/Main.vue'
import List from '../pages/List/List.vue'
import Gate from '../pages/Gate/Gate.vue'
import Login from '../pages/Login/Login.vue'
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
            path: '/viewer',
            beforeEnter() {
              window.open('/vtk_viewer/index.html', '_blank');
            },
        },
        {
            path:'/login',
            component:Login
        },
        {
            path:'/',
            redirect:'/gate'
        },
    ]
})
router.beforeEach((to, from, next) => {
    const token = jsCookie.get('token');
    if (to.path !== '/login' && !token) {
      next('/login')
    } else {
      next()
    }
});

export default router