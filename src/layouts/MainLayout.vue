<template>
  <el-container class="main-layout">
    <el-aside :width="isCollapsed ? '64px' : '200px'" class="aside">
      <div class="aside-logo">
        <img src="../../public/ai_logo.png" alt="logo" />
        <span v-if="!isCollapsed">AI Ads Manager</span>
      </div>
      <el-menu
        :default-active="$route.path"
        class="el-menu-vertical"
        :collapse="isCollapsed"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <template #title>主控台</template>
        </el-menu-item>
        <el-menu-item
          v-if="userStore.userInfo?.role === 'admin' || userStore.userInfo?.permissions?.can_view_ai_jobs"
          index="/ad-jobs"
        >
          <el-icon><Document /></el-icon>
          <template #title>AI投放</template>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <template #title>个人中心</template>
        </el-menu-item>
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
        <span>AI Ads Manager v1.0.0 ©2025 Created by You</span>
      </el-footer>
      </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document, DataLine, Fold, Expand, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleLogout = () => {
  userStore.logout()
}
</script>

<style scoped>
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

/* ▼▼▼ 2. 为 footer 增加样式 ▼▼▼ */
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
/* ▲▲▲ 新增结束 ▲▲▲ */
</style>
