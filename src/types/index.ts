export interface ApiResponse<T = any> {
  status: number
  message: string
  data: T
}
export interface Campaign {
  id?: string
  name: string
  budget: number
  locations: number[]
  languages: number[]
  adGroups: AdGroup[]
  [key: string]: any
}

export interface AdGroup {
  id?: string
  name: string
  keywords: Keyword[]
  ads: Ad[]
}

export interface Keyword {
  text: string
  matchType: 'EXACT' | 'PHRASE' | 'BROAD'
}

export interface Ad {
  headlines: string[]
  descriptions: string[]
}

export interface Account {
  id: number
  job_id: number | null
  job_status: 'DRAFT' | 'PENDING_UPDATE' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | null
  sub_account_name: string
  sub_account_id: string
  manager_name: string
  currency_code: 'USD' | 'CNY' | 'HKD' | string
  campaigns_data: Campaign[] | null
  affiliate_account?: string | null // <--- 在这里添加
  [key: string]: any
}

export interface AiGeneratedContent {
  headlines: { original: string; translation_zh: string }[]
  descriptions: { original: string; translation_zh: string }[]
}

// 定义AI返回结果中单个条目的类型
export interface AiResultItem {
  original: string
  translation_zh: string
}

// 定义完整的AI结果类型
export interface AiResults {
  headlines: AiResultItem[]
  descriptions: AiResultItem[]
}
// ▼▼▼ 修改 UserInfo 接口 ▼▼▼
export interface UserInfo {
  id: number
  username: string
  nickname: string | null
  email: string | null // 确保 email 字段存在
  role: 'user' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  open_router_api_key: string | null
  permissions: { [key: string]: boolean }
  // --- 新增: 为 UserInfo 添加可选的 token 字段 ---
  linkbux_api_token?: string | null
}

// =======================================================
// ▼▼▼ 【核心新增】导出 PlatformSetting 类型 ▼▼▼
// =======================================================
export interface PlatformSetting {
  id: number
  user_id: number
  platform_name: string
  api_key: string
  api_secret: string
  other_config: string
  default_params: string
  default_interval: number
  default_referer: string
  created_at: string
  updated_at: string
}
// =======================================================
// ▲▲▲ 新增结束 ▲▲▲
// =======================================================
