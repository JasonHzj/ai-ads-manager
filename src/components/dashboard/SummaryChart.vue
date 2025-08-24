<template>
  <div ref="chartRef" style="width: 100%; height: 220px"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import type { PropType } from 'vue'
import * as echarts from 'echarts'
import type { DailyChartPoint } from '@/api'

const props = defineProps({
  chartData: {
    type: Array as PropType<DailyChartPoint[]>,
    required: true
  }
})

const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)

const setChartOption = () => {
  if (!chartInstance.value) return

  const dates = props.chartData.map(item => item.date)
  const pendingData = props.chartData.map(item => item.pending)
  const rejectedData = props.chartData.map(item => item.rejected)
  const approvedData = props.chartData.map(item => item.approved)
  const roiData = props.chartData.map(item => item.roi)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      },
      formatter: (params: any[]) => {
        let total = 0
        // 使用params[0].axisValue来获取原始的YYYY-MM-DD日期
        let content = `<strong>${params[0].axisValue}</strong><br/>`
        params.forEach(item => {
          const value = item.value || 0
          if (item.seriesType === 'bar') {
            total += value
          }
          const formattedValue = item.seriesName === 'ROI' ? value.toFixed(2) : `$${value.toFixed(2)}`
          content += `${item.marker} ${item.seriesName}: ${formattedValue}<br/>`
        })
        content += `<strong><span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:grey;"></span> 汇总: $${total.toFixed(2)}</strong>`
        return content
      }
    },
    legend: {
      data: ['Approved', 'Pending', 'Rejected', 'ROI'],
      top: 'top',
      left: 'center',
      itemWidth: 14,
      itemHeight: 14,
      textStyle: {
        color: '#606266'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%', // 底部留白可以适当减小
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: dates,
        axisTick: {
          alignWithLabel: true
        },
        axisLine: {
          lineStyle: {
            color: '#dcdfe6'
          }
        },
        // ▼▼▼ 核心修正区域 ▼▼▼
        axisLabel: {
          color: '#909399',
          fontSize: 11,
          // 1. 格式化标签为 "MM-DD"
          formatter: function (value: string) {
            // value 的格式是 "YYYY-MM-DD"
            return value.slice(5);
          },
          // 2. 智能显示，防止重叠
          interval: 'auto'
        }
        // ▲▲▲ 修正结束 ▲▲▲
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '佣金',
        position: 'left',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          formatter: '${value}',
          color: '#909399'
        },
        splitLine: {
          lineStyle: {
            color: '#f2f2f2'
          }
        }
      },
      {
        type: 'value',
        name: 'ROI',
        position: 'right',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          formatter: '{value}',
          color: '#909399'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: 'Approved',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: { color: '#2dd05e' },
        data: approvedData
      },
      {
        name: 'Pending',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: { color: '#e6a23c' },
        data: pendingData
      },
      {
        name: 'Rejected',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: { color: '#ff5b5b' },
        data: rejectedData
      },
      {
        name: 'ROI',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#a2a2a2' },
        itemStyle: { color: '#a2a2a2' },
        data: roiData
      }
    ]
  }
  chartInstance.value.setOption(option, true)
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    setChartOption()
  }
})

watch(() => props.chartData, setChartOption, { deep: true })
</script>
