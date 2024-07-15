import Vue from 'vue'
import VueRouter from 'vue-router'
import jsCookie from 'js-cookie'

import Main from '../pages/Main/Main.vue'
import List from '../pages/List/List.vue'
import Gate from '../pages/Gate/Gate.vue'
import Login from '../pages/Login/Login.vue'
import Viewer from '../pages/Viewer/Viewer.vue'
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
            path:'/viewer',
            component:Viewer
        },
        {
            path:'/login',
            component:Login
        },
        {
            path:'/',
            redirect:'/main'
        },
    ]
})
router.beforeEach((to, from, next) => {
    // const token = jsCookie.get('token');
    // if (to.path !== '/login' && !token) {
    //   next('/login')
    // } else {
    //   next()
    // }
    next()
});
  
export default router