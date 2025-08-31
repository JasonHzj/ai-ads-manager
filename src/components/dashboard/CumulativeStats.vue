<template>
  <div v-loading="loading" class="cumulative-stats-container">
    <div class="db-card-title">累计数据总览</div>
    <el-row :gutter="20">
      <el-col :span="14">
        <h4 class="sub-title">各账户佣金汇总</h4>
        <el-table
          :data="accountSummary"
          class="ranking-table"
          height="250"
          @row-click="handleRowClick"
          highlight-current-row
          show-summary
          :summary-method="getSummaries"
        >
          <el-table-column label="账户名" prop="account_name" show-overflow-tooltip>
            <template #default="{ row }">
              <el-popover
                placement="right"
                title="Top 5 Offers"
                :width="300"
                :visible="visiblePopoverId === row.platform_account_id"
                popper-class="db-popover"
              >
                <template #reference>
                  <span class="account-name-cell">{{ row.account_name }}</span>
                </template>
                <div v-if="getPopoverState(row.platform_account_id).loading" class="popover-loading">
                  <el-icon class="is-loading"><Loading /></el-icon> 加载中...
                </div>
                <div v-else-if="getPopoverState(row.platform_account_id).data" class="popover-content">
                  <div v-if="getPopoverState(row.platform_account_id).data!.approved.length > 0">
                    <strong>已发放 Top 5:</strong>
                    <ul>
                      <li v-for="offer in getPopoverState(row.platform_account_id).data!.approved" :key="offer.offer_name">
                        {{ offer.offer_name }}: <i>{{ formatCurrency(offer.total_commission) }}</i>
                      </li>
                    </ul>
                  </div>
                  <div v-if="getPopoverState(row.platform_account_id).data!.pending.length > 0">
                    <strong>待确认 Top 5:</strong>
                    <ul>
                      <li v-for="offer in getPopoverState(row.platform_account_id).data!.pending" :key="offer.offer_name">
                        {{ offer.offer_name }}: <i>{{ formatCurrency(offer.total_commission) }}</i>
                      </li>
                    </ul>
                  </div>
                  <div v-if="getPopoverState(row.platform_account_id).data!.rejected.length > 0">
                    <strong>已拒绝 Top 5:</strong>
                    <ul>
                      <li v-for="offer in getPopoverState(row.platform_account_id).data!.rejected" :key="offer.offer_name">
                        {{ offer.offer_name }}: <i>{{ formatCurrency(offer.total_commission) }}</i>
                      </li>
                    </ul>
                  </div>
                  <div v-if="isPopoverDataEmpty(getPopoverState(row.platform_account_id).data)" class="popover-empty">
                    无详细Offer数据
                  </div>
                </div>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column label="已发放" prop="approved" align="right">
             <template #default="{ row }">{{ formatCurrency(row.approved) }}</template>
          </el-table-column>
          <el-table-column label="待确认" prop="pending" align="right">
             <template #default="{ row }">{{ formatCurrency(row.pending) }}</template>
          </el-table-column>
          <el-table-column label="拒绝" prop="rejected" align="right">
             <template #default="{ row }">{{ formatCurrency(row.rejected) }}</template>
          </el-table-column>
        </el-table>
      </el-col>
      <el-col :span="10">
        <h4 class="sub-title">各账户佣金占比</h4>
        <div ref="donutChartRef" style="width: 100%; height: 245px"></div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef, reactive, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import {
  getCumulativeStatsAPI,
  getTopOffersForAccountAPI,
  type TopOffersData,
  type AccountSummary,
  type DonutChartData
} from '@/api/index'
import { ElMessage } from 'element-plus'
import type { TableColumnCtx } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

// --- 1. 新增 platform prop ---
const props = defineProps<{
  platform?: string
}>()

interface SummaryData {
  approved: number
  pending: number
  rejected: number
}
const loading = ref(true)
const donutChartRef = ref<HTMLElement | null>(null)
const donutChartInstance = shallowRef<echarts.ECharts | null>(null)
const accountSummary = ref<AccountSummary[]>([])
const donutChartData = ref<DonutChartData>({ total_amount: 0, distribution: [] })
const popoverStateMap = reactive<Map<number, { loading: boolean; data: TopOffersData | null }>>(new Map())
const visiblePopoverId = ref<number | null>(null)

const getPopoverState = (accountId: number) => {
  if (!popoverStateMap.has(accountId)) {
    popoverStateMap.set(accountId, { loading: false, data: null })
  }
  return popoverStateMap.get(accountId)!
}

const handleRowClick = async (row: AccountSummary) => {
  if (visiblePopoverId.value === row.platform_account_id) {
    visiblePopoverId.value = null
    return
  }

  const state = getPopoverState(row.platform_account_id)
  visiblePopoverId.value = row.platform_account_id

  if (state.loading || state.data !== null || !props.platform) {
    return
  }

  try {
    state.loading = true
    // --- 2. 在API调用中增加 platform 参数 ---
    const response = await getTopOffersForAccountAPI(row.platform_account_id, props.platform)
    state.data = response.data.data
  } catch (error) {
    console.error('获取Top Offer数据失败:', error)
    state.data = { approved: [], pending: [], rejected: [] }
  } finally {
    state.loading = false
  }
}

// --- (其余辅助函数 handleOutsideClick, isPopoverDataEmpty, getSummaries, formatCurrency, setDonutChartOption 保持不变) ---
const handleClickOutside = (event: MouseEvent) => {
  const popover = document.querySelector('.el-popover.el-popper')
  if (popover && !popover.contains(event.target as Node)) {
    visiblePopoverId.value = null
  }
}
const isPopoverDataEmpty = (data: TopOffersData | null | undefined) => {
  if (!data) return true
  return !data.approved?.length && !data.pending?.length && !data.rejected?.length
}
const getSummaries = (param: {
  columns: TableColumnCtx<AccountSummary>[]
  data: AccountSummary[]
}) => {
  const { columns, data } = param
  const sums: (string | number)[] = []
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '总计'
      return
    }
    const values = data.map((item) => Number(item[column.property as keyof SummaryData]))
    if (!values.every((value) => Number.isNaN(value))) {
      const sum = values.reduce((prev, curr) => {
        const value = Number(curr)
        if (!Number.isNaN(value)) {
          return prev + curr
        } else {
          return prev
        }
      }, 0)
      sums[index] = formatCurrency(sum)
    } else {
      sums[index] = 'N/A'
    }
  })
  return sums
}
const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(num || 0)
}
const setDonutChartOption = (data: DonutChartData) => {
    if (!donutChartInstance.value) return;
    const option = {
        title: {
            subtext: formatCurrency(data.total_amount),
            text: '累计金额',
            left: 'center',
            top: '42%',
            textStyle: { fontSize: 14, color: '#333333' },
            subtextStyle: { fontSize: 16,  color: '#000000', fontFamily: 'Oswald, sans-serif' }
        },
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [
            {
                name: '账号占比',
                type: 'pie',
                radius: ['60%', '80%'],
                avoidLabelOverlap: false,
                label: { show: false },
                data: data.distribution
            }
        ]
    };
    donutChartInstance.value.setOption(option);
}

// --- 3. 修改 fetchData 函数 ---
const fetchData = async () => {
  // 增加对 platform 的校验
  if (!props.platform) return
  loading.value = true
  try {
    // --- 4. 在API调用中增加 platform 参数 ---
    const response = await getCumulativeStatsAPI(props.platform)
    const statsData = response.data.data
    accountSummary.value = statsData.account_summary
    donutChartData.value = statsData.donut_chart
    popoverStateMap.clear()
    statsData.account_summary.forEach(item => {
      popoverStateMap.set(item.platform_account_id, { loading: false, data: null })
    });
    if (donutChartInstance.value) {
      setDonutChartOption(donutChartData.value)
    }
  } catch (error) {
    ElMessage.error('获取累计统计数据失败')
  } finally {
    loading.value = false
  }
}

// --- 5. 新增 watch 监听 platform 变化 ---
watch(() => props.platform, (newPlatform) => {
  if (newPlatform) {
    fetchData();
  }
}, { immediate: true }) // immediate: true 可以在组件创建时立即执行一次

onMounted(() => {
  if (donutChartRef.value) {
    donutChartInstance.value = echarts.init(donutChartRef.value)
    // onMounted 不再直接调用 fetchData，交由 watch 的 immediate 来处理
  }
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>


<style>
/* Popover的非scoped样式，用于覆盖element-plus的默认样式 */
.db-popover {
  background-color: var(--db-card-bg-color) !important;
  border: 1px solid var(--db-border-color) !important;
  color: var(--db-text-color) !important;
}
.db-popover .el-popper__arrow::before {
  background-color: var(--db-card-bg-color) !important;
  border-color: var(--db-border-color) !important;
}
.db-popover .el-popover__title {
  color: var(--db-title-color) !important;
  border-bottom: 1px solid var(--db-border-color) !important;
}
</style>

<style scoped>
.cumulative-stats-container {
  padding: 20px;
}
.sub-title {
  text-align: center;
  font-size: 16px;
  color: var(--db-text-color);
  margin-top: 0;
  margin-bottom: 15px;
}
.ranking-table {
  --el-table-border-color: var(--db-border-color);
  --el-table-header-bg-color: transparent;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(67, 126, 217, 0.1);
  --el-table-text-color: var(--db-text-color);
  --el-table-header-text-color: var(--db-title-color);
}
.popover-loading, .popover-empty {
  text-align: center;
  color: #999;
  padding: 20px 0;
}
.popover-content ul {
  padding-left: 20px;
  margin: 5px 0;
}
.popover-content li {
  display: flex;
  justify-content: space-between;
}
.popover-content li span {
  font-weight: bold;
  color: var(--db-success-color);
}
.account-name-cell {
  cursor: pointer;
  display: inline-block;
  width: 100%;
}
</style>
