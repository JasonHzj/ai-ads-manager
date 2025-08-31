<template>
  <div class="left-panel">
    <el-space v-if="dateRange" direction="vertical" alignment="stretch" fill :size="20" style="width: 100%">

      <div class="db-card">
        <TopMetrics
          :start-date="dateRange[0]"
          :end-date="dateRange[1]"
          :platform="platform"
        />
      </div>

      <div class="db-card">
        <TrendsChart
          :start-date="dateRange[0]"
          :end-date="dateRange[1]"
          :platform="platform"
        />
      </div>

      <div class="db-card">
        <CumulativeStats
          :platform="platform"
        />
      </div>

    </el-space>
  </div>
</template>

<script setup lang="ts">
import TopMetrics from './TopMetrics.vue'
import TrendsChart from './TrendsChart.vue'
import CumulativeStats from './CumulativeStats.vue'

// 这个组件的 props 定义保持不变
defineProps<{
  dateRange: [string, string] | null
  platform: string
}>()
</script>
<style scoped>

</style>
