<template>
  <div class="metric-box">
    <div class="title">{{ title }}</div>
    <div class="value" :class="color">{{ formatCurrency(value) }}</div>
    <div class="details">
      <span v-if="ratio !== undefined" class="ratio">
        占比: {{ (ratio * 100).toFixed(1) }}%
      </span>
      <span class="change">
        环比: <span :class="getChangeClass(change)">{{ (change * 100).toFixed(1) }}%</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  value: number
  change: number
  ratio?: number
  color?: 'orange' | 'red' | 'green'
}>()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

// ▼▼▼ 核心修正：交换 getChangeClass 函数中的颜色 ▼▼▼
const getChangeClass = (changeValue: number) => {
  if (changeValue > 0) {
    return 'green'; // 上升为绿色
  } else if (changeValue < 0) {
    return 'red'; // 下降为红色
  }
  return ''; // 不变则为默认颜色
};
</script>

<style scoped>
.metric-box {
  flex: 1;
  text-align: center;
  padding: 10px;
}
.title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.value {
  font-size: 22px;
  font-weight: 500;
  font-family: 'Oswald', sans-serif;
  margin-bottom: 8px;
  color: #303133;
}
.details {
  font-size: 12px;
  color: #909399;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.ratio {
  background-color: #f0f2f5;
  padding: 2px 5px;
  border-radius: 4px;
}

.change .green {
  color: #2dd05e;
  font-weight: 500;
}
.change .red {
  color: #ff5b5b;
  font-weight: 500;
}

.value.orange {
  color: #e6a23c;
}
.value.red {
  color: #f56c6c;
}
.value.green {
  color: #67c23a;
}
</style>
