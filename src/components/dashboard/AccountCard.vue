<template>
  <div class="account-card db-card">
    <div class="card-header">
      <span class="account-name">{{ currentData.account_name || '广告详情' }}</span>
      <div class="top-metrics">
        <template v-if="currentData.spend !== undefined && currentData.roi !== undefined">
          <span>ADS消费: <span class="value">{{ formatCurrency(currentData.spend) }}</span></span>
          <span class="roi">ROI: <span class="value">{{ currentData.roi.toFixed(2) }}</span></span>
        </template>
      </div>
    </div>

    <div class="kpi-row">
      <MetricBox title="总佣金" :value="currentData.total_commission.value" :change="currentData.total_commission.change" />
      <MetricBox title="Approved" :value="currentData.approved_commission.value" :change="currentData.approved_commission.change" :ratio="currentData.approved_commission.ratio" color="green" />
      <MetricBox title="Pending" :value="currentData.pending_commission.value" :change="currentData.pending_commission.change" :ratio="currentData.pending_commission.ratio" color="orange" />
      <MetricBox title="Rejected" :value="currentData.rejected_commission.value" :change="currentData.rejected_commission.change" :ratio="currentData.rejected_commission.ratio" color="red" />
    </div>

    <div class="ads-row">
      <div class="ad-tags-container">
        <el-tag
          v-for="ad in currentData.active_ads"
          :key="ad.ad_id"
          class="ad-tag"
          :class="{ active: selectedAdId === ad.ad_id }"
          @click="handleAdClick(ad)"
          effect="plain"
        >
          {{ ad.ad_name }} ({{ ad.ad_id }}): {{ formatCurrency(ad.commission) }}
        </el-tag>
      </div>
      <el-button v-if="selectedAdId" type="primary" link @click="resetToSummary">返回总览</el-button>
    </div>

    <div class="chart-row">
      <SummaryChart :chart-data="currentData.summary_chart_data" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import { getRightPanelAdDetailAPI, type RightPanelData, type ActiveAd } from '@/api'
import MetricBox from './MetricBox.vue'
import SummaryChart from './SummaryChart.vue'
import { ElMessage } from 'element-plus'

// --- 1. 新增 platform prop ---
const props = defineProps({
  initialData: {
    type: Object as PropType<RightPanelData>,
    required: true
  },
  dateRange: {
    type: Object as PropType<[string, string] | null>,
    required: true
  },
  platform: {
    type: String,
    required: true
  }
})

const selectedAdId = ref<number | null>(null)
const adDetailData = ref<RightPanelData | null>(null)

const currentData = computed(() => {
  return selectedAdId.value && adDetailData.value ? adDetailData.value : props.initialData
})

const handleAdClick = async (ad: ActiveAd) => {
  if (!props.dateRange) {
    ElMessage.warning('请先选择日期范围');
    return;
  }
  if (selectedAdId.value === ad.ad_id) return;

  adDetailData.value = null
  selectedAdId.value = ad.ad_id
  try {
    // --- 2. 在API调用中增加 platform 参数 ---
    const response = await getRightPanelAdDetailAPI(props.dateRange[0], props.dateRange[1], ad.ad_id, props.platform)
    adDetailData.value = response.data.data
  } catch (error) {
    ElMessage.error(`获取广告 ${ad.ad_name} 的详情失败`)
    selectedAdId.value = null // 失败时重置状态
  }
}

const resetToSummary = () => {
  selectedAdId.value = null
  adDetailData.value = null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value || 0) // 增加 fallback 确保 value 不是 undefined
}
</script>

<style scoped>
.account-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 20px;
}

/* 第1行：标题 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f2f5;
}
.account-name {
  font-size: 18px;
  font-weight: bold;
}
.top-metrics {
  font-size: 14px;
  color: #606266;
}
.top-metrics .value {
  font-weight: 500;
  font-family: 'Oswald', sans-serif;
  color: #303133;
}
.metric-box .value{
  font-size: 32px;
}
.top-metrics .roi {
  margin-left: 20px;
}

/* 第2行：KPI指标 */
.kpi-row {
  display: flex;
  justify-content: space-between;
  text-align: center;
  padding: 20px 0;
}

/* ▼▼▼ 核心修正：为指标块添加分隔线 ▼▼▼ */
/* 使用 :deep() 穿透子组件的样式，并选择除了第一个之外的所有 .metric-box */
.kpi-row :deep(.metric-box:not(:first-child)) {
  border-left: 1px solid #f0f2f5; /* 添加淡灰色左边框作为分隔线 */
}
/* ▲▲▲ 修正结束 ▲▲▲ */


/* 第3行：广告标签 */
.ads-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px 0;
  border-top: 1px solid #f0f2f5;
  border-bottom: 1px solid #f0f2f5;
  min-height: 38px;
}
.ad-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-grow: 1;
}
.ad-tag {
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.ad-tag.active {
  background-color: var(--el-color-primary);
  color: #fff;
  border-color: var(--el-color-primary);
}

/* 第4行：图表 */
.chart-row {
  padding-top: 20px;
}
</style>
