<template>
  <div class="auth-wrapper">
    <div class="auth-left">
      <div class="particles">
        <div v-for="i in 50" :key="i" class="particle"></div>
      </div>
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
        <img src="/ai_logo2.png" alt="Logo" class="login-logo" />
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
/* 主容器和基本布局 */
.auth-wrapper {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden; /* 防止动画溢出 */
}

/* --- 左侧区域美学升级 --- */
.auth-left {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  position: relative; /* 为粒子效果定位 */
  overflow: hidden;
  /* 核心：动态渐变背景 */
  background: linear-gradient(
    -45deg,
    #0d1a33,
    #1a3a68,
    #0f2c5d,
    #0a183d
  );
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
}

/* 品牌信息容器 - 增加入场动画 */
.brand-info {
  max-width: 480px;
  text-align: center;
  color: #ffffff;
  z-index: 2; /* 确保内容在背景之上 */
  /* 动画效果 */
  animation: fadeInFromLeft 1s ease-out forwards;
}

.brand-title {
  font-size: 48px;
  font-weight: 600;
  margin-bottom: 16px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.brand-tagline {
  font-size: 20px;
  color: #a7c0e8;
  margin-bottom: 32px;
}

.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  color: #d1e0ff;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
}

.feature-item {
  font-size: 14px;
}


/* --- 右侧区域美学升级 --- */
.auth-right {
  width: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fff;
  transition: width 0.3s ease; /* 为响应式添加过渡效果 */
}

/* 登录容器 - 增加入场动画 */
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeInFromRight 1s ease-out forwards;
}

.login-logo {
  width: 120px;
  height: 120px;
  margin-bottom: 20px;
}

.auth-card {
  width: 400px;
  border: none;
  box-shadow: none;
  background: none; /* 卡片背景设为透明 */
}

.switch-link {
  text-align: center;
  margin-top: 10px;
}


/* --- 动画效果定义 --- */

/* 渐变背景动画 */
@keyframes gradientBG {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 左侧内容入场动画 */
@keyframes fadeInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 右侧内容入场动画 */
@keyframes fadeInFromRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 粒子效果 */
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.particle {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  opacity: 0;
  animation: float 20s infinite linear;
}

/* 为每个粒子设置随机大小、位置和动画延迟 */
.particle:nth-child(1) { width: 7px; height: 7px; left: 15%; animation-delay: -2s; }
.particle:nth-child(2) { width: 4px; height: 4px; left: 25%; animation-delay: -5s; }
.particle:nth-child(3) { width: 6px; height: 6px; left: 50%; animation-delay: -8s; }
.particle:nth-child(4) { width: 3px; height: 3px; left: 70%; animation-delay: -3s; }
.particle:nth-child(5) { width: 5px; height: 5px; left: 90%; animation-delay: -10s; }
.particle:nth-child(6) { width: 8px; height: 8px; left: 10%; animation-delay: -12s; }
.particle:nth-child(7) { width: 4px; height: 4px; left: 35%; animation-delay: -1s; }
.particle:nth-child(8) { width: 6px; height: 6px; left: 65%; animation-delay: -15s; }
.particle:nth-child(9) { width: 3px; height: 3px; left: 80%; animation-delay: -6s; }
.particle:nth-child(10) { width: 7px; height: 7px; left: 20%; animation-delay: -11s; }
.particle:nth-child(11) { width: 4px; height: 4px; left: 5%; animation-delay: -4s; }
.particle:nth-child(12) { width: 5px; height: 5px; left: 45%; animation-delay: -9s; }
.particle:nth-child(13) { width: 8px; height: 8px; left: 75%; animation-delay: -14s; }
.particle:nth-child(14) { width: 3px; height: 3px; left: 95%; animation-delay: -7s; }
.particle:nth-child(15) { width: 6px; height: 6px; left: 30%; animation-delay: -13s; }
.particle:nth-child(16) { width: 4px; height: 4px; left: 60%; animation-delay: -2s; }
.particle:nth-child(17) { width: 7px; height: 7px; left: 40%; animation-delay: -16s; }
.particle:nth-child(18) { width: 3px; height: 3px; left: 55%; animation-delay: -19s; }
.particle:nth-child(19) { width: 5px; height: 5px; left: 2%; animation-delay: -17s; }
.particle:nth-child(20) { width: 8px; height: 8px; left: 88%; animation-delay: -18s; }
.particle:nth-child(21) { width: 4px; height: 4px; left: 18%; animation-delay: -12s; }
.particle:nth-child(22) { width: 6px; height: 6px; left: 28%; animation-delay: -7s; }
.particle:nth-child(23) { width: 3px; height: 3px; left: 38%; animation-delay: -15s; }
.particle:nth-child(24) { width: 5px; height: 5px; left: 48%; animation-delay: -4s; }
.particle:nth-child(25) { width: 7px; height: 7px; left: 58%; animation-delay: -11s; }
.particle:nth-child(26) { width: 4px; height: 4px; left: 68%; animation-delay: -6s; }
.particle:nth-child(27) { width: 6px; height: 6px; left: 78%; animation-delay: -13s; }
.particle:nth-child(28) { width: 3px; height: 3px; left: 88%; animation-delay: -1s; }
.particle:nth-child(29) { width: 5px; height: 5px; left: 98%; animation-delay: -18s; }
.particle:nth-child(30) { width: 8px; height: 8px; left: 8%; animation-delay: -9s; }
.particle:nth-child(31) { width: 4px; height: 4px; left: 12%; animation-delay: -14s; }
.particle:nth-child(32) { width: 6px; height: 6px; left: 22%; animation-delay: -3s; }
.particle:nth-child(33) { width: 3px; height: 3px; left: 32%; animation-delay: -10s; }
.particle:nth-child(34) { width: 5px; height: 5px; left: 42%; animation-delay: -5s; }
.particle:nth-child(35) { width: 7px; height: 7px; left: 52%; animation-delay: -12s; }
.particle:nth-child(36) { width: 4px; height: 4px; left: 62%; animation-delay: -8s; }
.particle:nth-child(37) { width: 6px; height: 6px; left: 72%; animation-delay: -16s; }
.particle:nth-child(38) { width: 3px; height: 3px; left: 82%; animation-delay: -2s; }
.particle:nth-child(39) { width: 5px; height: 5px; left: 92%; animation-delay: -17s; }
.particle:nth-child(40) { width: 8px; height: 8px; left: 2%; animation-delay: -6s; }
.particle:nth-child(41) { width: 4px; height: 4px; left: 14%; animation-delay: -11s; }
.particle:nth-child(42) { width: 6px; height: 6px; left: 24%; animation-delay: -1s; }
.particle:nth-child(43) { width: 3px; height: 3px; left: 34%; animation-delay: -9s; }
.particle:nth-child(44) { width: 5px; height: 5px; left: 44%; animation-delay: -14s; }
.particle:nth-child(45) { width: 7px; height: 7px; left: 54%; animation-delay: -4s; }
.particle:nth-child(46) { width: 4px; height: 4px; left: 64%; animation-delay: -10s; }
.particle:nth-child(47) { width: 6px; height: 6px; left: 74%; animation-delay: -18s; }
.particle:nth-child(48) { width: 3px; height: 3px; left: 84%; animation-delay: -5s; }
.particle:nth-child(49) { width: 5px; height: 5px; left: 94%; animation-delay: -13s; }
.particle:nth-child(50) { width: 8px; height: 8px; left: 4%; animation-delay: -7s; }


@keyframes float {
  0% {
    transform: translateY(100vh) scale(0);
    opacity: 0;
  }
  1% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-10vh) scale(1);
    opacity: 0;
  }
}


/* --- 响应式布局 --- */
@media (max-width: 992px) {
  .auth-left {
    display: none; /* 在中等屏幕及以下隐藏左侧 */
  }
  .auth-right {
    width: 100%; /* 右侧占据全部宽度 */
  }
  .auth-card {
    width: 90%;
    max-width: 400px;
  }
}
</style>
