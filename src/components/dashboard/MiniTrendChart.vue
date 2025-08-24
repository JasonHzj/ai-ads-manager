<template>
  <div ref="chartRef" style="width: 100%; height: 60px"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef, watch } from 'vue'
import type { PropType } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  // ▼▼▼ 核心修正：更新传入数据的类型 ▼▼▼
  trendData: {
    type: Array as PropType<{ date: string; commissions: Record<string, number> }[]>,
    required: true
  },
  accountNames: {
    type: Array as PropType<string[]>,
    required: true
  }
})

const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)

const setChartOption = () => {
  if (!chartInstance.value || !props.trendData) return

  const dates = props.trendData.map(item => item.date)

  // ▼▼▼ 核心修正：根据所有账户名，动态生成图表的series ▼▼▼
  const series = props.accountNames.map(accountName => {
    return {
      name: accountName,
      type: 'bar',
      stack: 'total', // 所有账户的佣金堆叠在一起
      barWidth: '60%',
      data: props.trendData.map(day => day.commissions[accountName] || 0)
    };
  });

  const option = {
    grid: {
      left: 0,
      right: 0,
      top: 5,
      bottom: 5
    },
    xAxis: {
      type: 'category',
      data: dates,
      show: false
    },
    yAxis: {
      type: 'value',
      show: false
    },
    tooltip: {
      trigger: 'axis',
      // ▼▼▼ 核心修正：Tooltip现在会显示每个账户的佣金和总和 ▼▼▼
      formatter: (params: any[]) => {
        let tooltipContent = `<strong>${params[0].name}</strong><br/>`;
        let total = 0;
        params.forEach(item => {
          const value = item.value || 0;
          total += value;
          tooltipContent += `${item.seriesName}: $${value.toFixed(2)}<br/>`;
        });
        tooltipContent += `<strong>总计: $${total.toFixed(2)}</strong>`;
        return tooltipContent;
      }
    },
    series: series // 应用我们动态生成的series
  }
  chartInstance.value.setOption(option, true); // 使用 true 来确保旧的series被清除
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    setChartOption()
  }
})

watch(() => props.trendData, setChartOption, { deep: true })
</script>
