// 文件: src/stores/user.ts (调试修正版)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginAPI, registerAPI } from '@/api/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { jwtDecode } from 'jwt-decode'

interface UserInfo {
  id: number
  username: string
  nickname: string | null
  role: 'user' | 'admin'
  exp: number
  permissions: {
    [key: string]: boolean
  }
}

export const useUserStore = defineStore('user', () => {
  const router = useRouter()
  const token = ref(localStorage.getItem('ADS_ADMIN_TOKEN') || '')
  const userInfo = ref<UserInfo | null>(null)

  const logout = (message = '已成功退出登录') => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('ADS_ADMIN_TOKEN')
    router.push('/login')
    ElMessage.success(message)
  }

  const setUserInfoFromToken = (tokenValue: string) => {
    if (tokenValue) {
      try {
        const decoded = jwtDecode<UserInfo>(tokenValue.replace('Bearer ', ''))

        console.log('[Debug] 1. 从Token解码出的原始数据:', decoded)

        if (decoded.exp * 1000 < Date.now()) {
          logout('您的登录已过期，请重新登录')
          return
        }

        // ▼▼▼ 核心修正：在这里增加JSON字符串的解析逻辑 ▼▼▼
        let permissionsObject = decoded.permissions || {}
        console.log(
          '[Debug] 2. 解码出的 permissions 字段类型:',
          typeof permissionsObject,
          permissionsObject,
        )

        if (typeof permissionsObject === 'string') {
          try {
            console.log('[Debug] 3. 检测到权限是字符串，正在尝试解析...')
            permissionsObject = JSON.parse(permissionsObject)
            console.log('[Debug] 4. 解析成功！现在的权限是对象:', permissionsObject)
          } catch (e) {
            console.error('解析权限字符串失败:', e)
            permissionsObject = {} // 解析失败则给予空权限
          }
        }
        decoded.permissions = permissionsObject
        // ▲▲▲ 修正结束 ▲▲▲

        userInfo.value = decoded
        console.log('[Debug] 5. 最终存入 userStore 的 userInfo:', userInfo.value)
      } catch (error) {
        console.error('Token解码失败:', error)
        logout('Token无效，请重新登录')
      }
    }
  }

  if (token.value) {
    setUserInfoFromToken(token.value)
  }

  const isAuthenticated = computed(() => !!token.value && !!userInfo.value)

  const login = async (credentials: any) => {
    try {
      const response = await loginAPI(credentials)
      if (response.data.status === 0) {
        token.value = response.data.token
        localStorage.setItem('ADS_ADMIN_TOKEN', token.value)
        setUserInfoFromToken(token.value)
        ElMessage.success('登录成功！')
        router.push('/')
        return true
      } else {
        return false
      }
    } catch (error: any) {
      return false
    }
  }

  const register = async (credentials: any) => {
    /* ... (此函数保持不变) ... */
  }
  return { token, userInfo, isAuthenticated, register, login, logout }
})
