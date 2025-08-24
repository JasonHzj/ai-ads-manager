<template>
  <div class="top-metrics-container" v-loading="loading">
    <div class="metric-item">
      <div class="metric-title">Linkbux总佣金</div>
      <div class="metric-value">{{ formatCurrency(metrics.total_commission.value) }}</div>
      <div class="metric-change" :class="getChangeClass(metrics.total_commission.change)">
        <el-icon><CaretTop /></el-icon>
        环比 {{ formatPercentage(metrics.total_commission.change) }}
      </div>
    </div>
    <el-divider direction="vertical" class="metric-divider" />
    <div class="metric-item">
      <div class="metric-title">ADS消费金额</div>
      <div class="metric-value">{{ formatCurrency(metrics.total_ads_spend.value) }}</div>
      <div class="metric-change" :class="getChangeClass(metrics.total_ads_spend.change)">
        <el-icon><CaretTop /></el-icon>
        环比 {{ formatPercentage(metrics.total_ads_spend.change) }}
      </div>
    </div>
     <el-divider direction="vertical" class="metric-divider" />
    <div class="metric-item">
      <div class="metric-title">ROI</div>
      <div class="metric-value">{{ metrics.roi.value.toFixed(2) }}</div>
      <div class="metric-change" :class="getChangeClass(metrics.roi.change)">
        <el-icon><CaretTop /></el-icon>
        环比 {{ formatPercentage(metrics.roi.change) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
// ▼▼▼ 修正：从 @/api/index 导入 ▼▼▼
import { getTopLeftMetricsAPI, type TopLeftMetricsData } from '@/api/index'
import { ElMessage } from 'element-plus'
import { CaretTop } from '@element-plus/icons-vue' // 引入图标
const props = defineProps<{
  startDate?: string
  endDate?: string
}>()

const loading = ref(true)
const metrics = ref<TopLeftMetricsData>({
  total_commission: { value: 0, change: 0 },
  total_ads_spend: { value: 0, change: 0 },
  roi: { value: 0, change: 0 }
})

const fetchData = async () => {
  if (!props.startDate || !props.endDate) return
  loading.value = true
  try {
    // ▼▼▼ 修正：调用新的API函数并正确解析数据 ▼▼▼
    const response = await getTopLeftMetricsAPI(props.startDate, props.endDate)
    metrics.value = response.data.data
  } catch (error) {
    ElMessage.error('获取核心指标失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

watch(() => [props.startDate, props.endDate], fetchData)
onMounted(fetchData)

// --- 格式化函数 ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(2)}%`
}

const getChangeClass = (value: number) => {
  return value >= 0 ? 'positive' : 'negative'
}
</script>

<style scoped>
.top-metrics-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px;
}
.metric-item {
  text-align: center;
  flex: 1;
}
.metric-title {
  font-size: 14px;
  color: var(--db-text-color);
  margin-bottom: 12px;
}
.metric-value {
  font-family: var(--db-font-number);
  font-size: 28px;
  font-weight: 500;
  color: var(--db-title-color);
  margin-bottom: 12px;
}
.metric-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.metric-change .el-icon {
  margin-right: 4px;
  transition: transform 0.3s;
}
.positive {
  color: var(--db-success-color);
}
.negative {
  color: var(--db-danger-color);
}
.negative .el-icon {
  transform: rotate(180deg);
}
.metric-divider {
  height: 60px;
  background-color: var(--db-border-color);
}
</style>
