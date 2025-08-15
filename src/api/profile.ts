// 文件: src/api/profile.ts (修正版)

import axios from 'axios'
import { useUserStore } from '@/stores/user'

// 与您项目中其他API文件保持一致，创建独立的axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:3006/api',
  timeout: 10000,
})

// 为这个实例添加请求拦截器，自动附加Token
apiClient.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = userStore.token
  }
  return config
})

// --- 个人资料相关 ---
export const getMyProfileAPI = () => apiClient.get('/user/profile')
export const updateMyProfileAPI = (data: any) => apiClient.put('/user/profile', data)

// --- Ads脚本密钥相关 ---
export const getMyApiKeysAPI = () => apiClient.get('/keys')
export const generateApiKeyAPI = (description: string) => apiClient.post('/keys', { description })
export const deleteApiKeyAPI = (keyId: number) => apiClient.delete(`/keys/${keyId}`)

// --- 管理员专用 ---
export const getAllUsersAPI = () => apiClient.get('/admin/users')
export const updateUserStatusAndRoleAPI = (
  userId: number,
  data: { status?: string; role?: string },
) => apiClient.put(`/admin/users/${userId}`, data)
export const updateUserPermissionsAPI = (userId: number, permissions: any) =>
  apiClient.put(`/admin/users/${userId}/permissions`, { permissions })
