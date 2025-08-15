// 文件: src/composables/useAdOptions.ts (已更新)

import { ref, onMounted, readonly } from 'vue'
import { getCountriesAPI, getLanguagesAPI } from '@/api'

const countries = ref<any[]>([])
const languages = ref<any[]>([])
const isLoading = ref(false)
const hasFetched = ref(false)

export function useAdOptions() {
  const fetchOptions = async () => {
    if (isLoading.value || hasFetched.value) {
      return
    }

    isLoading.value = true
    try {
      const [countriesRes, languagesRes] = await Promise.all([getCountriesAPI(), getLanguagesAPI()])

      if (countriesRes.data.status === 0) {
        const fetchedCountries = countriesRes.data.data

        // ▼▼▼ 核心修改在这里 ▼▼▼
        // 创建“所有国家地区”选项
        const allCountriesOption = {
          criterion_id: 'all', // 使用一个特殊的字符串ID
          name: 'EN',
          name_zh: '所有国家',
        }
        // 将它添加到列表的最前面
        fetchedCountries.unshift(allCountriesOption)
        countries.value = fetchedCountries
        // ▲▲▲ 修改结束 ▲▲▲
      }
      if (languagesRes.data.status === 0) {
        languages.value = languagesRes.data.data
      }

      hasFetched.value = true
    } catch (error) {
      console.error('Failed to fetch ad options:', error)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(fetchOptions)

  return {
    countries: readonly(countries),
    languages: readonly(languages),
    isLoading: readonly(isLoading),
  }
}
