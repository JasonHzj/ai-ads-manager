<template>
  <div v-loading="loading" class="trends-chart-container">
    <div class="db-card-title">消费与佣金趋势</div>
    <div ref="chartRef" style="width: 100%; height: 300px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, shallowRef, computed } from 'vue'
import * as echarts from 'echarts'
import { getDailyTrendsChartAPI } from '@/api/index'
import type { DailyTrendsChartData } from '@/api/index' // 引入类型
import { ElMessage } from 'element-plus'

const props = defineProps<{
  startDate?: string
  endDate?: string
}>()

const loading = ref(true)
const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)
const chartData = ref<(DailyTrendsChartData & { roi: number[] }) | null>(null) // 新增 ref 存储数据

// ▼▼▼ 新增：计算总计佣金 ▼▼▼
const commissionTotal = computed(() => {
  if (!chartData.value) return 0
  const pendingTotal = chartData.value.pending_commission.reduce((sum, val) => sum + val, 0)
  const rejectedTotal = chartData.value.rejected_commission.reduce((sum, val) => sum + val, 0)
  return pendingTotal + rejectedTotal
})

// ▼▼▼ 新增：格式化货币函数 ▼▼▼
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const setChartOption = (data: DailyTrendsChartData & { roi: number[] }) => {
  if (!chartInstance.value) return
  // ... (setChartOption 函数内部的 option 配置保持不变)
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
        axisLabel: { formatter: (value: number) => `${value}`, color: '#888' },
        axisLine: { show: true, lineStyle: { color: '#888' } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'ADS消费', type: 'bar',
        tooltip: { valueFormatter: (value: number) => '$' + value },
        itemStyle: { color: '#5470c6' },
        data: data.ads_spend
      },
      {
        name: 'Pending佣金', type: 'bar', stack: 'Commission',
        tooltip: { valueFormatter: (value: number) => '$' + value },
        itemStyle: { color: '#e6a23c' },
        data: data.pending_commission
      },
      {
        name: 'Rejected佣金', type: 'bar', stack: 'Commission',
        tooltip: { valueFormatter: (value: number) => '$' + value },
        itemStyle: { color: '#ff5b5b' },
        data: data.rejected_commission
      },
      {
        name: 'ROI', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle',
        tooltip: { valueFormatter: (value: number) => value },
        lineStyle: { color: '#a2a2a2', width: 2 },
        itemStyle: { color: '#a2a2a2' },
        data: data.roi
      }
    ]
  }
  chartInstance.value.setOption(option)
}





const fetchData = async () => {
  if (!props.startDate || !props.endDate) return
  loading.value = true
try {
    const response = await getDailyTrendsChartAPI(props.startDate, props.endDate)
    const chartData = response.data.data

    // ▼▼▼ 核心修正：在使用数据前，进行严格的安全检查 ▼▼▼
    if (chartData && chartData.dates && chartData.dates.length > 0) {
      // 只有在确认数据有效时，才去渲染图表
      setChartOption(chartData)
    } else {
      // 如果数据为空，就在控制台打印一条信息，图表将保持空白，不会报错
      console.log('左侧趋势图：所选日期范围内无数据。')
    }
  } catch (error) {
    ElMessage.error('获取左侧趋势图数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    fetchData()
  }
})

watch(() => [props.startDate, props.endDate], fetchData)
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
