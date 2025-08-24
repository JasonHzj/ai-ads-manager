<template>
  <div v-loading="loading" class="right-panel-container">
    <div v-if="panelData.length > 0" class="right-panel-wrapper">
      <AccountCard
        v-for="accountData in panelData"
        :key="accountData.account_id"
        :initial-data="accountData"
        :date-range="dateRange"
      />
    </div>
    <el-empty v-else-if="!loading" description="无账户数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AccountCard from './AccountCard.vue'
import { getRightPanelSummaryAPI, type RightPanelData } from '@/api'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  dateRange: [string, string] | null
}>()

const loading = ref(true)
const panelData = ref<RightPanelData[]>([])

const fetchSummaryData = async () => {
  if (!props.dateRange) return;
  loading.value = true;
  try {
    const response = await getRightPanelSummaryAPI(props.dateRange[0], props.dateRange[1])
    panelData.value = response.data.data
  } catch (error) {
    // 当请求超时时，Axios会进入catch块，我们可以在这里清空数据并提示用户
    panelData.value = [] // 清空旧数据
    ElMessage.error('获取右侧面板数据超时或失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// ▼▼▼ 核心修正：优化 watch 监听器 ▼▼▼
watch(() => props.dateRange, (newDateRange) => {
  // 只有当 newDateRange 是一个有效的、包含两个日期的数组时，才执行查询
  // 这可以防止在选择过程中触发不必要的API调用
  if (newDateRange && newDateRange.length === 2 && newDateRange[0] && newDateRange[1]) {
    fetchSummaryData();
  }
}, { immediate: true }) // immediate: true 保证了页面首次加载时会立即执行一次查询
</script>

<style scoped>
.right-panel-container {
  height: 100%;
}
.right-panel-wrapper {
  height: 100%;
  overflow-y: auto;
  padding-right: 10px;
}
.right-panel-wrapper::-webkit-scrollbar {
  width: 6px;
}
.right-panel-wrapper::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}
.right-panel-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
</style>
