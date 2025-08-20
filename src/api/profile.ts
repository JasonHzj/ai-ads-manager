// 文件: src/api/profile.ts (修正版)

import axios from 'axios'
import { useUserStore } from '@/stores/user'

// 定义 PlatformAccount 类型，方便多处使用
export interface PlatformAccount {
  id?: number
  platform_name: string
  account_name: string
  api_token?: string // 发送时需要，获取时不返回
}

// 与您项目中其他API文件保持一致，创建独立的axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api',
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
/**
 * 获取当前用户的所有联盟平台账户
 */
export const getPlatformAccountsAPI = (): Promise<any> => {
  // 返回 any 以匹配 axios 原始响应
  return apiClient.get('/user/platform-accounts')
}

/**
 * 批量保存(覆盖)当前用户的所有联盟平台账户
 */
export const savePlatformAccountsAPI = (accounts: PlatformAccount[]): Promise<any> => {
  return apiClient.post('/user/platform-accounts', { accounts })
}
