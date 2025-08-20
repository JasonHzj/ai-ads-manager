import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api',
  timeout: 30000,
})

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = userStore.token
  }
  return config
})

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    ElMessage.error(error.response?.data?.message || '网络请求失败')
    return Promise.reject(error)
  },
)

// --- API 函数 ---
export const loginAPI = (data: any) => apiClient.post('/login', data)
export const registerAPI = (data: any) => apiClient.post('/register', data)
export const getAccountsAPI = (data: { userId: number }) => {
  return apiClient.post('/accounts', data)
}
export const getCountriesAPI = () => apiClient.get('/options/countries')
export const getLanguagesForCountryAPI = (countryId: string | number) =>
  apiClient.get(`/options/languages-for-country/${countryId}`)
export const generateAIContentAPI = (data: any) => apiClient.post('/ai/generate', data)
export const getJobsAPI = () => apiClient.get('/jobs')
export const createJobAPI = (data: any) => apiClient.post('/jobs', data)
export const saveDraftAPI = (data: any) => apiClient.post('/jobs/draft', data)
// ▼▼▼ 在这里添加下面这行新代码 ▼▼▼
export const getLanguagesAPI = () => apiClient.get('/options/languages')
// ▲▲▲ 添加结束 ▲▲▲
// **新增：批量提交草稿的API**
export const submitJobsAPI = (jobIds: number[]) => apiClient.post('/jobs/submit', { jobIds })
// 新增：请求删除任务的API
export const requestDeleteJobAPI = (jobId: number) =>
  apiClient.post('/jobs/request-deletion', { jobId })
// **新增：上传Excel文件的API**
export const importExcelAPI = (formData: FormData) =>
  apiClient.post('/jobs/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
// 新增：批量请求删除任务的API
export const requestBatchDeleteAPI = (jobIds: number[]) =>
  apiClient.post('/jobs/request-batch-deletion', { jobIds })
export const getTransactionsAPI = () => apiClient.get('/platforms/transactions')
export const triggerInitialSyncAPI = (accountId: number, startDate: string) =>
  apiClient.post('/platforms/linkbux/initial-sync', { accountId, startDate })
