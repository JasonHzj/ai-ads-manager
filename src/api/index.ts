import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // baseURL 现在只包含域名和端口
  timeout: 1000000,
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

// --- 您已有的 API 函数 (已统一添加 /api 前缀) ---
export const loginAPI = (data: any) => apiClient.post('/api/login', data)
export const registerAPI = (data: any) => apiClient.post('/api/register', data)
export const getAccountsAPI = (data: { userId: number }) => {
  return apiClient.post('/api/accounts', data)
}
export const getCountriesAPI = () => apiClient.get('/api/options/countries')
export const getLanguagesForCountryAPI = (countryId: string | number) =>
  apiClient.get(`/api/options/languages-for-country/${countryId}`)
export const generateAIContentAPI = (data: any) => apiClient.post('/api/ai/generate', data)
export const getJobsAPI = () => apiClient.get('/api/jobs')
export const createJobAPI = (data: any) => apiClient.post('/api/jobs', data)
export const saveDraftAPI = (data: any) => apiClient.post('/api/jobs/draft', data)
export const getLanguagesAPI = () => apiClient.get('/api/options/languages')
export const submitJobsAPI = (jobIds: number[]) => apiClient.post('/api/jobs/submit', { jobIds })
export const requestDeleteJobAPI = (jobId: number) =>
  apiClient.post('/api/jobs/request-deletion', { jobId })
export const importExcelAPI = (formData: FormData) =>
  apiClient.post('/api/jobs/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const requestBatchDeleteAPI = (jobIds: number[]) =>
  apiClient.post('/api/jobs/request-batch-deletion', { jobIds })
export const getTransactionsAPI = () => apiClient.get('/api/platforms/transactions')
export const triggerInitialSyncAPI = (accountId: number, startDate: string) =>
  apiClient.post('/api/platforms/linkbux/initial-sync', { accountId, startDate })

export const rewriteAiAdItemAPI = (data: {
  textToRewrite: string
  itemType: 'headline' | 'description'
  context: string // 核心创意
  model?: string
  target_language?: string
}) => apiClient.post('/api/ai/rewrite-item', data)

// =======================================================================
//                看板相关 API (Dashboard APIs)
// =======================================================================

// --- 类型定义 ---

export interface TopLeftMetricsData {
  total_commission: { value: number; change: number }
  total_ads_spend: { value: number; change: number }
  roi: { value: number; change: number }
}

export interface DailyTrendsChartData {
  dates: string[]
  pending_commission: number[]
  rejected_commission: number[]
  ads_spend: number[]
  roi: number[]
}

export interface AccountSummary {
  platform_account_id: number
  account_name: string
  approved: number
  pending: number
  rejected: number
}

export interface DonutChartData {
  total_amount: number
  distribution: { name: string; value: number }[]
}

export interface CumulativeStatsData {
  account_summary: AccountSummary[]
  donut_chart: DonutChartData
}

export interface TopOfferDetail {
  offer_name: string
  total_commission: string
}

export interface TopOffersData {
  approved: TopOfferDetail[]
  pending: TopOfferDetail[]
  rejected: TopOfferDetail[]
}

// --- API 函数 ---

export const getTopLeftMetricsAPI = (startDate: string, endDate: string) =>
  apiClient.get('/api/dashboard/top-left-metrics', { params: { startDate, endDate } })

export const getDailyTrendsChartAPI = (startDate: string, endDate: string) =>
  apiClient.get('/api/dashboard/daily-trends-chart', { params: { startDate, endDate } })

export const getCumulativeStatsAPI = () =>
  apiClient.get<{ data: CumulativeStatsData }>('/api/dashboard/cumulative-stats')

export const getTopOffersForAccountAPI = (accountId: number) =>
  apiClient.get<{ data: TopOffersData }>(`/api/dashboard/top-offers/${accountId}`)

// 单个Offer卡片的数据结构
export interface OfferData {
  ad_id: number
  offer_name: string
  logo: string | null
  logo_fallback: string
  roi: number
  multi_account_commissions: Record<string, number>
  cvr: number
  commission_mom: number
  // 新增的两个字段
  total_commission: number
  approved_commission: number
  // 原有的字段
  pending_commission: number
  rejected_commission: number
  commission_trend: {
    date: string
    commissions: Record<string, number>
  }[]
}
// 整个API返回的数据结构
export interface DashboardData {
  global_roi: number
  all_account_names: string[] // <-- 新增
  offers: OfferData[]
}
// ▼▼▼ 新增：搜索结果的类型定义 ▼▼▼
export interface AdSearchResult {
  value: string
  merchant_name: string
  platform_ad_id: string
}

// ▼▼▼ 新增：右侧面板相关类型定义 ▼▼▼

// 单个广告的浓缩信息 (用于第3行)
export interface ActiveAd {
  ad_id: number
  ad_name: string
  commission: number
}

// 每日图表数据点
export interface DailyChartPoint {
  date: string
  pending: number
  rejected: number
  approved: number
  roi: number
}

// 右侧面板单个账户/广告的数据结构
export interface RightPanelData {
  account_id?: number // 账户ID，在广告详情模式下可能没有
  account_name?: string // 账户名，在广告详情模式下可能没有
  spend: number
  roi: number
  total_commission: { value: number; change: number }
  pending_commission: { value: number; ratio: number; change: number }
  rejected_commission: { value: number; ratio: number; change: number }
  approved_commission: { value: number; ratio: number; change: number }
  active_ads: ActiveAd[]
  summary_chart_data: DailyChartPoint[]
}

// --- API 函数 ---

/**
 * 获取看板的Offer列表数据
 */
// ▼▼▼ 核心修正：修改 getDashboardOfferListAPI 的参数 ▼▼▼
export const getDashboardOfferListAPI = (params: {
  startDate?: string
  endDate?: string
  adId?: string
}) => apiClient.get<{ data: DashboardData }>('/api/dashboard/offer-list', { params })

// ▼▼▼ 新增：搜索API函数 ▼▼▼
export const searchAdsAPI = (keyword: string) =>
  apiClient.get<{ data: AdSearchResult[] }>(`/api/dashboard/search-ads`, { params: { keyword } })

/**
 * 获取右侧面板的所有账户汇总数据
 */
export const getRightPanelSummaryAPI = (startDate: string, endDate: string) =>
  apiClient.get<{ data: RightPanelData[] }>('/api/dashboard/right-panel/summary', {
    params: { startDate, endDate },
  })

/**
 * 获取右侧面板单个广告的详细数据
 */
export const getRightPanelAdDetailAPI = (startDate: string, endDate: string, adId: number) =>
  apiClient.get<{ data: RightPanelData }>('/api/dashboard/right-panel/ad-detail', {
    params: { startDate, endDate, adId },
  })
