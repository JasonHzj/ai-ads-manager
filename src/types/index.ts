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
