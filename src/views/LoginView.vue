<template>
  <div class="auth-wrapper">
    <div class="auth-left">
      <div class="brand-info">
        <h1 class="brand-title">AI Ads Manager</h1>
        <p class="brand-tagline">“AI改写未来，Ads智能化投放”</p>
        <div class="brand-features">
          <div class="feature-item">✓ 智能管理您的营销链接</div>
          <div class="feature-item">✓ 提升转化率与安全性</div>
          <div class="feature-item">✓ 自动化链接轮换</div>
          <div class="feature-item">✓ 精准控制链接更新</div>
        </div>
      </div>
    </div>
    <div class="auth-right">
      <div class="login-container">
        <img src="../../public/ai_logo2.png" alt="Logo" class="login-logo" />

        <el-card class="auth-card" header="用户登录">
          <el-form @submit.prevent="handleLogin">
            <el-form-item>
              <el-input v-model="form.username" placeholder="账号" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="密码"
                show-password
                size="large"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                @click="handleLogin"
                :loading="loading"
                style="width: 100%"
                size="large"
                >登 录</el-button
              >
            </el-form-item>
            <div class="switch-link">
              没有账户？ <el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
            </div>
          </el-form>
        </el-card>
      </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
const form = ref({ username: '', password: '' })
const loading = ref(false)
const userStore = useUserStore()
const handleLogin = async () => {
  if (!form.value.username || !form.value.password) return
  loading.value = true
  await userStore.login(form.value)
  loading.value = false
}
</script>

<style scoped>
.auth-wrapper {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}
.auth-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}
.brand-info {
  max-width: 480px;
}
.brand-title {
  font-size: 48px;
  font-weight: 600;
  margin-bottom: 16px;
}
.brand-tagline {
  font-size: 20px;
  color: #606266;
  margin-bottom: 32px;
}
.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  color: #303133;
}
.auth-right {
  width: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fff;
}
.auth-card {
  width: 400px;
  border: none;
  box-shadow: none;
}
.switch-link {
  text-align: center;
  margin-top: 10px;
}

/* ▼▼▼ 2. 为新增的容器和Logo添加样式 ▼▼▼ */
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.login-logo {
  width: 200px; /* 您可以根据需要调整Logo的大小 */
  height: 200px;
     position: relative;
    top: -70px;
}
/* ▲▲▲ 新增样式结束 ▲▲▲ */
</style>
