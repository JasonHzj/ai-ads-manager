<template>
  <div class="top-metrics-container" v-loading="loading">
    <template v-if="metrics">
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
        <div class="metric-value">{{ metrics.roi.value ? metrics.roi.value.toFixed(2) : '0.00' }}</div>
        <div class="metric-change" :class="getChangeClass(metrics.roi.change)">
          <el-icon><CaretTop /></el-icon>
          环比 {{ formatPercentage(metrics.roi.change) }}
        </div>
      </div>
    </template>
    <div v-else class="skeleton-container">
      <el-skeleton :rows="2" animated />
      <el-skeleton :rows="2" animated />
      <el-skeleton :rows="2" animated />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
// 修正：从您正确的 API 文件路径导入
import { getTopLeftMetricsAPI, type TopLeftMetricsData } from '@/api'
import { ElMessage } from 'element-plus'
import { CaretTop } from '@element-plus/icons-vue'

// --- 1. 新增 platform prop，使其可复用 ---
const props = defineProps({
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  }
})

const loading = ref(true)
// 修正：将 metrics 的初始值设为 null，方便 v-if 判断
const metrics = ref<TopLeftMetricsData | null>(null)

// --- 2. 修改数据获取函数 ---
const fetchData = async () => {
  if (!props.startDate || !props.endDate || !props.platform) return
  loading.value = true
  try {
    // --- 3. 在API调用中增加 platform 参数 ---
    const response = await getTopLeftMetricsAPI(props.startDate, props.endDate, props.platform)

    // ▼▼▼ 核心修正：正确地从响应中提取数据 ▼▼▼
    // 您的后端返回 { status, message, data }, 我们需要的是最里面的 data
    if (response && response.data) {
        metrics.value = response.data.data
    } else {
        // 如果后端没有返回 data 字段，给一个默认值防止报错
        metrics.value = null;
    }

  } catch (error) {
    ElMessage.error('获取核心指标失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// --- 4. 监听所有prop的变化 ---
// immediate: true 可以在组件创建时立即执行一次 fetchData
watch(() => [props.startDate, props.endDate, props.platform], fetchData, { immediate: true })

// --- 格式化函数 (与您原有代码一致) ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
}

const formatPercentage = (value: number) => {
  return `${((value || 0) * 100).toFixed(2)}%`
}

const getChangeClass = (value: number) => {
  return (value || 0) >= 0 ? 'positive' : 'negative'
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
