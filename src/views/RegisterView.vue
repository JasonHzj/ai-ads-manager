<template>
  <div class="auth-wrapper">
    <div class="auth-left">
      <div class="brand-info">
        <h1 class="brand-title">AI Ads Manager</h1>
        <p class="brand-tagline">“技术平民化，让技术不再高高在上”</p>
        <div class="brand-features">
          <div class="feature-item">✓ 智能管理您的营销链接</div>
          <div class="feature-item">✓ 提升转化率与安全性</div>
          <div class="feature-item">✓ 自动化链接轮换</div>
          <div class="feature-item">✓ 精准控制链接更新</div>
        </div>
      </div>
    </div>
    <div class="auth-right">
      <el-card class="auth-card" header="创建新账户">
        <el-form @submit.prevent="handleRegister">
          <el-form-item>
            <el-input v-model="form.username" placeholder="设置用户名" size="large" />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="设置密码"
              show-password
              size="large"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="handleRegister"
              :loading="loading"
              style="width: 100%"
              size="large"
              >注 册</el-button
            >
          </el-form-item>
          <div class="switch-link">
            已有账户？ <el-link type="primary" @click="$router.push('/login')">返回登录</el-link>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
const form = ref({ username: '', password: '' })
const loading = ref(false)
const userStore = useUserStore()
const handleRegister = async () => {
  if (!form.value.username || !form.value.password) return
  loading.value = true
  await userStore.register(form.value)
  loading.value = false
}
</script>

<style scoped>
/* 复用登录页的样式 */
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
</style>
