<template>
  <div v-loading="loading" class="right-panel-container">
    <div v-if="panelData.length > 0" class="right-panel-wrapper">
      <AccountCard
        v-for="accountData in panelData"
        :key="accountData.account_id"
        :initial-data="accountData"
        :date-range="dateRange"
        :platform="platform"
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

// --- 1. 新增 platform prop ---
const props = defineProps<{
  dateRange: [string, string] | null,
  platform: string
}>()

const loading = ref(true)
const panelData = ref<RightPanelData[]>([])

const fetchSummaryData = async () => {
  // 增加对 platform 的校验
  if (!props.dateRange || !props.platform) return;
  loading.value = true;
  try {
    // --- 2. 在API调用中增加 platform 参数 ---
    const response = await getRightPanelSummaryAPI(props.dateRange[0], props.dateRange[1], props.platform)
    // --- 3. 修正数据提取逻辑 ---
    // 因为拦截器已处理 .data，所以直接使用 response.data
    panelData.value = response.data.data
  } catch (error) {
    panelData.value = []
    ElMessage.error('获取右侧面板数据超时或失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// --- 4. 监听所有 prop 的变化 ---
watch(() => [props.dateRange, props.platform], (newVal) => {
  const [newDateRange, newPlatform] = newVal;
  if (newDateRange && newDateRange.length === 2 && newDateRange[0] && newDateRange[1] && newPlatform) {
    fetchSummaryData();
  }
}, { immediate: true, deep: true })
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
