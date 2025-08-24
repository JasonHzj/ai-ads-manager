<template>
  <div class="dashboard-container">
    <el-row :gutter="20" class="main-content dashboard-main-row">
      <el-col :span="8">
        <div class="date-picker-container">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="shortcuts"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </div>
        <LeftPanel :date-range="dateRange" />
      </el-col>

      <el-col :span="8">
        <div v-loading="loading" class="offer-list-container">
          <div class="date-picker-container">
            <el-autocomplete
              v-model="searchKeyword"
              :fetch-suggestions="querySearchAsync"
              placeholder="按广告名或ID搜索 (全时段)"
              @select="handleSearchSelect"
              clearable
              @clear="clearSearch"
              class="ad-search-input"
            >

            </el-autocomplete>
          </div>
          <div v-if="dashboardData && dashboardData.offers.length > 0" class="offer-cards-wrapper">
            <OfferCard
              v-for="offer in dashboardData.offers"
              :key="offer.ad_id"
              :offer="offer"
              :account-names="dashboardData.all_account_names || []"
            />
          </div>
          <el-empty v-else-if="!loading" :description="emptyText" />
        </div>
      </el-col>

      <el-col :span="8">
        <RightPanel :date-range="dateRange" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LeftPanel from '@/components/dashboard/LeftPanel.vue'
import OfferCard from '@/components/dashboard/OfferCard.vue'
import { getDashboardOfferListAPI, searchAdsAPI, type DashboardData, type AdSearchResult } from '@/api'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import '@/styles/dashboard.css'
import { Search } from '@element-plus/icons-vue'
import RightPanel from '@/components/dashboard/RightPanel.vue';

const loading = ref(true)
const dateRange = ref<[string, string] | null>([ // 允许为null，增强健壮性
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
])
const dashboardData = ref<DashboardData | null>(null)
const emptyText = ref('所选日期范围内无数据')
const searchKeyword = ref('')
const isSearchMode = ref(false)

const querySearchAsync = async (queryString: string, cb: (arg: any) => void) => {
  if (!queryString) return cb([]);
  try {
    const response = await searchAdsAPI(queryString)
    cb(response.data.data)
  } catch (error) {
    console.error('搜索失败:', error)
    cb([])
  }
}

const handleSearchSelect = (item: AdSearchResult) => {
  isSearchMode.value = true
  dateRange.value = null // 清空并禁用日期选择器
  emptyText.value = '正在加载搜索结果...'
  fetchDashboardData({ adId: item.platform_ad_id })
}

const clearSearch = () => {
  isSearchMode.value = false
  dateRange.value = [
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ]
  fetchDashboardData({ dateRange: dateRange.value })
}

const handleDateChange = (newDateRange: [string, string] | null) => {
  if (newDateRange) {
    isSearchMode.value = false
    searchKeyword.value = ''
    fetchDashboardData({ dateRange: newDateRange })
  }
}

const fetchDashboardData = async (params: { dateRange?: [string, string] | null; adId?: string }) => {
  loading.value = true
  try {
    let apiParams: { startDate?: string; endDate?: string; adId?: string } = {};

    if (params.adId) {
      apiParams = { adId: params.adId };
    }
    else if (params.dateRange && params.dateRange.length === 2) {
      apiParams = { startDate: params.dateRange[0], endDate: params.dateRange[1] };
    }
    else {
      // 如果参数无效（例如dateRange是null），安全退出，不发送请求
      loading.value = false;
      return;
    }

    const response = await getDashboardOfferListAPI(apiParams)
    dashboardData.value = response.data.data

    if (dashboardData.value?.offers.length === 0) {
      emptyText.value = params.adId ? '未找到该广告的任何数据' : '所选日期范围内无数据';
    }
  } catch (error) {
    ElMessage.error('获取看板数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if(dateRange.value){
    fetchDashboardData({ dateRange: dateRange.value })
  }
})

const shortcuts = [
    {
    text: '本周',
    value: () => {
      const start = dayjs().startOf('week').toDate()
      const end = dayjs().toDate()
      return [start, end]
    }
  },
  {
    text: '本月',
    value: () => {
      const start = dayjs().startOf('month').toDate()
      const end = dayjs().toDate()
      return [start, end]
    }
  },
  {
    text: '今年',
    value: () => {
      const start = dayjs().startOf('year').toDate()
      const end = dayjs().toDate()
      return [start, end]
    }
  },
  {
    text: '上周',
    value: () => {
      const start = dayjs().subtract(1, 'week').startOf('week').toDate()
      const end = dayjs().subtract(1, 'week').endOf('week').toDate()
      return [start, end]
    }
  },
  {
    text: '上月',
    value: () => {
      const start = dayjs().subtract(1, 'month').startOf('month').toDate()
      const end = dayjs().subtract(1, 'month').endOf('month').toDate()
      return [start, end]
    }
  },
  {
    text: '去年',
    value: () => {
      const start = dayjs().subtract(1, 'year').startOf('year').toDate()
      const end = dayjs().subtract(1, 'year').endOf('year').toDate()
      return [start, end]
    }
  }
]
</script>


<style scoped>
.dashboard-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.global-roi {
  display: flex;
  align-items: center;
  font-size: 16px;
  color: #606266;
}

.roi-value {
  font-size: 21px;
  font-weight: bold;
  color: #303133;
  margin-left: 10px;
  font-family: 'Oswald', sans-serif;
}



.main-content > .el-col {
  height: 1020px;
  overflow-y: auto; /* overflow: auto 的简写 */
}

.offer-list-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
}

.offer-cards-wrapper {
  flex-grow: 1;
  /* overflow-y: auto; <-- 这个可以移除，因为父级 el-col 已经有了 */
  padding-right: 10px;
}


/* ▼▼▼ 新增：美化滚动条的样式 ▼▼▼ */
/* 适用于所有子元素的滚动条 */
.main-content > .el-col::-webkit-scrollbar {
  width: 8px; /* 滚动条宽度 */
  background-color: #f5f7fa; /* 滚动条背景色，与主背景一致 */
}

/* 滚动条的滑块 */
.main-content > .el-col::-webkit-scrollbar-thumb {
  background-color: #dcdfe6; /* 滑块颜色 */
  border-radius: 4px; /* 滑块圆角 */
  border: 2px solid #f5f7fa; /* 增加边框，产生“悬浮”效果 */
}

/* 鼠标悬停在滑块上时 */
.main-content > .el-col::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc; /* 悬停时颜色变深 */
}
/* ▲▲▲ 新增结束 ▲▲▲ */


/* 占位符样式 (保持不变) */
.placeholder-card {
  height: 100%;
}
.placeholder-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 800px;
  font-size: 24px;
  color: #909399;
}
</style>
