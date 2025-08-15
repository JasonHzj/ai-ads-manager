// =======================================================================
// 第二步: 完善前端API服务层
// 作用: 创建或更新所有API请求的封装函数。
// =======================================================================

// --- 2a. 创建/更新文件: src/api/options.ts ---
import axios from 'axios'
import { useUserStore } from '@/stores/user'

const apiClient = axios.create({
  baseURL: 'http://localhost:3006/api',
  timeout: 10000, // AI请求可能需要更长时间
})

// 为这个实例添加请求拦截器，自动附加Token
apiClient.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = userStore.token
  }
  return config
})

export const getCountriesAPI = () => apiClient.get('/options/countries')
export const getLanguagesForCountryAPI = (countryId: string | number) =>
  apiClient.get(`/options/languages-for-country/${countryId}`)
export const generateAIContentAPI = (data: any) => apiClient.post('/ai/generate', data)

// --- 2b. 确认 src/api/accounts.ts 和 src/api/jobs.ts 已存在且配置了拦截器 ---
/* 请确保您已创建 `accounts.ts` 和 `jobs.ts`，并且它们内部的 `apiClient`
  也像上面的 `options.ts` 一样配置了请求拦截器来自动附加Token。
*/
