// 文件: src/router/index.ts (类型修正版)

import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import MainLayout from '../layouts/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        { path: 'dashboard', component: HomeView },
        {
          path: 'ad-jobs',
          component: () => import('../views/AdJobsView.vue'),
          meta: { permission: 'can_view_ai_jobs' },
        },
        { path: 'profile', component: () => import('../views/ProfileView.vue') },
      ],
    },
  ],
})

// 升级路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  const requiredPermission = to.meta.permission as string
  if (requiredPermission) {
    // ▼▼▼ 核心修正：增加管理员角色的判断 ▼▼▼
    const isAdmin = userStore.userInfo?.role === 'admin'
    const hasPermission =
      userStore.userInfo?.permissions && userStore.userInfo.permissions[requiredPermission]

    if (isAdmin || hasPermission) {
      // 如果是管理员 或者 有特定权限，则放行
      return next()
    } else {
      // 没有权限，提示并拦截
      ElMessage.error('您没有权限访问此页面！')
      return from.name ? next(false) : next({ path: '/dashboard' })
    }
    // ▲▲▲ 修正结束 ▲▲▲
  }

  if ((to.name === 'login' || to.name === 'register') && userStore.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  return next()
})

export default router
