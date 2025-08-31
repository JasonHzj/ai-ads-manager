<template>
  <div v-loading="loading" class="trends-chart-container">
    <div class="db-card-title">
        <span>消费与佣金趋势</span>
        <div v-if="chartData" class="total-display">
            总计: <span class="total-value">{{ formatCurrency(commissionTotal) }}</span>
        </div>
    </div>
    <div ref="chartRef" style="width: 100%; height: 300px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, shallowRef, computed } from 'vue'
import * as echarts from 'echarts'
import { getDailyTrendsChartAPI } from '@/api/index'
import type { DailyTrendsChartData } from '@/api/index'
import { ElMessage } from 'element-plus'

// --- 1. 新增 platform prop ---
const props = defineProps<{
  startDate?: string
  endDate?: string
  platform?: string // 设为可选，以防万一
}>()

const loading = ref(true)
const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)
const chartData = ref<DailyTrendsChartData | null>(null)

// 计算总计佣金 (与您原有代码一致)
const commissionTotal = computed(() => {
  if (!chartData.value) return 0
  const pendingTotal = chartData.value.pending_commission.reduce((sum, val) => sum + val, 0)
  const rejectedTotal = chartData.value.rejected_commission.reduce((sum, val) => sum + val, 0)
  // 注意：这里应该加总所有佣金，如果您的API返回了 approved_commission, 也应该加进来
  return pendingTotal + rejectedTotal
})

// 格式化货币函数 (与您原有代码一致)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

// ECharts option 配置 (与您原有代码一致)
const setChartOption = (data: DailyTrendsChartData) => {
  if (!chartInstance.value) return
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
      backgroundColor: 'rgba(18, 33, 67, 0.9)',
      borderColor: '#437ed9',
      textStyle: { color: '#c9d8ff' }
    },
    legend: {
      data: ['ADS消费', 'Pending佣金', 'Rejected佣金', 'ROI'],
      textStyle: { color: '#666' },
      top: 'top',
      left: 'center'
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: [
      {
        type: 'category',
        data: data.dates,
        axisPointer: { type: 'shadow' },
        axisLine: { lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666' }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '金额 (USD)',
        axisLabel: { formatter: (value: number) => `$${value}`, color: '#666' },
        axisLine: { show: true, lineStyle: { color: '#ccc' } },
        splitLine: { lineStyle: { color: '#eee' } }
      },
      {
        type: 'value',
        name: 'ROI',
        axisLabel: { formatter: (value: number) => `${(Number(value) || 0).toFixed(2)}`, color: '#888' }, // 修正：保留两位小数
        axisLine: { show: true, lineStyle: { color: '#888' } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'ADS消费', type: 'bar',
        tooltip: { valueFormatter: (value: number) => '$' + (Number(value) || 0).toFixed(2) },
        itemStyle: { color: '#5470c6' },
        data: data.ads_spend
      },
      {
        name: 'Pending佣金', type: 'bar', stack: 'Commission',
        tooltip: { valueFormatter: (value: number) => '$' + (Number(value) || 0).toFixed(2) },
        itemStyle: { color: '#e6a23c' },
        data: data.pending_commission
      },
      {
        name: 'Rejected佣金', type: 'bar', stack: 'Commission',
        tooltip: { valueFormatter: (value: number) => '$' + (Number(value) || 0).toFixed(2) },
        itemStyle: { color: '#ff5b5b' },
        data: data.rejected_commission
      },
      {
        name: 'ROI', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle',
        tooltip: { valueFormatter: (value: number) => (Number(value) || 0).toFixed(2) },
        lineStyle: { color: '#a2a2a2', width: 2 },
        itemStyle: { color: '#a2a2a2' },
        data: data.roi
      }
    ]
  }
  chartInstance.value.setOption(option)
}

// --- 2. 修改数据获取函数 ---
const fetchData = async () => {
  // 增加对 platform 的校验
  if (!props.startDate || !props.endDate || !props.platform) return
  loading.value = true
  try {
    // --- 3. 在API调用中增加 platform 参数 ---
    const response = await getDailyTrendsChartAPI(props.startDate, props.endDate, props.platform)

    // 因为拦截器已处理 .data，所以直接使用 response.data
    const data = response.data.data
    chartData.value = data // 存储数据以供 computed 使用

    if (data && data.dates && data.dates.length > 0) {
      setChartOption(data)
    } else {
      // 如果没有数据，清空图表
      chartInstance.value?.clear();
      console.log('趋势图：所选日期范围内无数据。')
    }
  } catch (error) {
    ElMessage.error('获取趋势图数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    // onMounted 时也调用 fetchData，确保初始加载
    fetchData()
  }
  // 监听窗口大小变化，自适应图表
  window.addEventListener('resize', () => {
    chartInstance.value?.resize();
  });
})

// --- 4. 监听所有 prop 的变化 ---
watch(() => [props.startDate, props.endDate, props.platform], fetchData, { deep: true })
</script>
<style scoped>
.trends-chart-container {
  padding: 20px;
}

/* ▼▼▼ 新增：总计数据的样式 ▼▼▼ */
.db-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-display {
  font-size: 14px;
  color: var(--db-text-color);
  font-weight: normal;
}

.total-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--db-success-color); /* 使用醒目的绿色 */
  margin-left: 8px;
  font-family: var(--db-font-number);
}
</style>
