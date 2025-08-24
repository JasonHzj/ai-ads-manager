<template>
  <el-container class="main-layout">
    <el-aside :width="isCollapsed ? '64px' : '200px'" class="aside">
      <div class="aside-logo">
        <img src="/ai_logo.png" alt="logo" />
        <span v-if="!isCollapsed">AI Ads Manager</span>
      </div>
      <el-menu
        :default-active="$route.path"
        class="el-menu-vertical"
        :collapse="isCollapsed"
        router
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-sub-menu
            v-if="route.children && route.children.length > 0"
            :index="'/' + route.path"
          >
            <template #title>
              <el-icon v-if="route.meta?.icon && iconMap[route.meta.icon as string]">
                <component :is="iconMap[route.meta.icon as string]" />
              </el-icon>
              <span>{{ route.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="'/' + route.path + '/' + child.path"
            >
              <el-icon v-if="child.meta?.icon && iconMap[child.meta.icon as string]">
                <component :is="iconMap[child.meta.icon as string]" />
              </el-icon>
              <span>{{ child.meta?.title }}</span>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item v-else :index="'/' + route.path">
            <el-icon v-if="route.meta?.icon && iconMap[route.meta.icon as string]">
              <component :is="iconMap[route.meta.icon as string]" />
            </el-icon>
            <template #title>{{ route.meta?.title }}</template>
          </el-menu-item>
        </template>
        </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <el-icon class="collapse-icon" @click="toggleSidebar">
          <Fold v-if="!isCollapsed" />
          <Expand v-else />
        </el-icon>
        <div class="user-info">
          <el-dropdown>
            <span>欢迎, {{ userStore.userInfo?.username || '用户' }}</span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
      <el-footer class="footer">
        <span>AI Ads Manager v1.1.0 ©2025 Created by Jason</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue' // 引入 shallowRef
import {
  Document,
  DataLine,
  Fold,
  Expand,
  User,
  DataAnalysis,
  TrendCharts
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { socket } from '@/socket'
import { useRouter } from 'vue-router'

// ▼▼▼ 核心修正：创建图标映射 ▼▼▼
const iconMap = shallowRef<Record<string, any>>({
  Document,
  DataLine,
  User,
  DataAnalysis,
  TrendCharts
})
// ▲▲▲ 修正结束 ▲▲▲

const userStore = useUserStore()
const router = useRouter()
const isCollapsed = ref(false)

const menuRoutes = computed(() => {
  const mainRoute = router.options.routes.find((r) => r.path === '/')
  return mainRoute?.children?.filter((route) => route.meta && route.meta.title) || []
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleLogout = () => {
  userStore.logout()
}

onMounted(() => {
  if (userStore.token && !socket.connected) {
    console.log('[MainLayout] ==> 正在尝试连接 Socket.IO...')
    socket.connect()
  }
})

onUnmounted(() => {
  if (socket.connected) {
    console.log('[MainLayout] ==> 正在断开 Socket.IO 连接...')
    socket.disconnect()
  }
})
</script>

<style scoped>
/* 您的样式保持不变 */
.main-layout {
  height: 100vh;
}
.aside {
  background-color: #001529;
  transition: width 0.3s;
  color: white;
}
.aside-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  overflow: hidden;
}
.aside-logo img {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}
.aside-logo span {
  font-size: 18px;
  font-weight: bold;
  white-space: nowrap;
}
.el-menu-vertical {
  border-right: none;
  background-color: #001529;
}
.el-menu-item {
  color: #a6adb4;
}
:deep(.el-sub-menu__title),
.el-menu-item {
  color: #a6adb4;
}
:deep(.el-sub-menu__title:hover),
.el-menu-item:hover {
  background-color: #000c17;
}
.el-menu-item.is-active {
  color: #fff;
  background-color: #1890ff;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.collapse-icon {
  font-size: 24px;
  cursor: pointer;
}
.user-info {
  display: flex;
  align-items: center;
}
.user-info span {
  margin-right: 15px;
}
.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.footer {
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  color: #909399;
  background-color: #f0f2f5;
  border-top: 1px solid #e0e0e0;
}
</style>
