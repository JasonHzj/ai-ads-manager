<template>
  <div class="left-panel">
    <el-space direction="vertical" alignment="stretch" fill :size="20" style="width: 100%">

      <div class="db-card">
        <TopMetrics :start-date="dateRange?.[0]" :end-date="dateRange?.[1]" />
      </div>

      <div class="db-card">
        <TrendsChart :start-date="dateRange?.[0]" :end-date="dateRange?.[1]" />
      </div>

      <div class="db-card">
        <CumulativeStats />
      </div>
    </el-space>
  </div>
</template>

<script setup lang="ts">
import TopMetrics from './TopMetrics.vue'
import TrendsChart from './TrendsChart.vue'
import CumulativeStats from './CumulativeStats.vue'

defineProps<{
  dateRange: [string, string] | null
}>()
</script>
<style scoped>

</style>
