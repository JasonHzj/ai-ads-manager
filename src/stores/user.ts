// 文件: src/stores/user.ts (错误提示已修复)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginAPI, registerAPI } from '@/api/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { jwtDecode } from 'jwt-decode'
import { getMyProfileAPI } from '@/api/profile'

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
  const isAdmin = computed(() => userInfo.value?.role === 'admin')
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
        if (decoded.exp * 1000 < Date.now()) {
          logout('您的登录已过期，请重新登录')
          return
        }

        // 处理权限字段可能为JSON字符串的情况
        let permissionsObject = decoded.permissions || {}
        if (typeof permissionsObject === 'string') {
          try {
            permissionsObject = JSON.parse(permissionsObject)
          } catch (e) {
            console.error('解析权限字符串失败:', e)
            permissionsObject = {}
          }
        }
        decoded.permissions = permissionsObject
        userInfo.value = decoded
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

  /**
   * @function login
   * @description 用户登录函数 (已修复错误提示)
   */
  const login = async (credentials: any) => {
    try {
      const response = await loginAPI(credentials)
      // 后端成功响应，我们根据 status 判断业务是否成功
      if (response.data.status === 0) {
        // 业务成功
        token.value = response.data.token
        localStorage.setItem('ADS_ADMIN_TOKEN', token.value)
        setUserInfoFromToken(token.value)
        ElMessage.success('登录成功！')
        router.push('/')
        return true
      } else {
        // ▼▼▼ 核心修正 ▼▼▼
        // 业务失败 (例如密码错误)，显示后端返回的 message
        ElMessage.error(response.data.message || '登录失败，未知错误')
        return false
      }
    } catch (error: any) {
      // ▼▼▼ 核心修正 ▼▼▼
      // 网络请求失败 (例如服务器500错误或无法连接)
      console.error('登录API调用失败:', error)
      // Axios会将错误信息包装在error.response中
      if (error.response && error.response.data && error.response.data.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('网络错误或服务器无响应，请稍后再试')
      }
      return false
    }
  }

  /**
   * @function register
   * @description 用户注册函数 (已同步修复错误提示)
   */
  const register = async (credentials: any) => {
    try {
      const response = await registerAPI(credentials)
      if (response.data.status === 0) {
        ElMessage.success(response.data.message || '注册成功，请等待审核！')
        router.push('/login')
        return true
      } else {
        // 业务失败 (例如用户名已存在)
        ElMessage.error(response.data.message || '注册失败，未知错误')
        return false
      }
    } catch (error: any) {
      // 网络请求失败
      console.error('注册API调用失败:', error)
      if (error.response && error.response.data && error.response.data.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('网络错误或服务器无响应，请稍后再试')
      }
      return false
    }
  }
  const fetchUserInfo = async () => {
    if (!token.value) return // 如果没有token，则不执行
    try {
      const res = await getMyProfileAPI()
      // 假设您的 getMyProfileAPI 返回的数据结构符合 { status, data }
      // 您可能需要根据实际返回调整这里的代码
      userInfo.value = res.data.data
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      logout() // 获取失败时登出
    }
  }
  return {
    token,
    userInfo,
    isAuthenticated,
    register,
    login,
    logout,
    fetchUserInfo,
    isAdmin,
    setUserInfoFromToken,
  }
})
