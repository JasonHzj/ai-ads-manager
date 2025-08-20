<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTransactionsAPI } from '@/api/index.ts'
import { ElMessage, ElTag } from 'element-plus'
// =======================================================================
// 文件: src/views/CommissionDataView.vue (新增)
// 作用: “佣金数据”页面，用于展示从所有平台同步过来的交易流水。
// =======================================================================

const transactions = ref<any[]>([])
const loading = ref(true)


const fetchTransactions = async () => {
  loading.value = true
  try {
    // 您的 axios 实例会返回 { data: { status, message, data } } 结构
    const res = await getTransactionsAPI()
    if (res.data.status === 0) {
      transactions.value = res.data.data || []
    } else {
      ElMessage.error(res.data.message || '数据加载失败')
    }
  } catch (error: any) {
    // 错误处理由您的拦截器负责，这里可以保留以防万一
    console.error('加载数据时出错:', error)
  } finally {
    loading.value = false
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'info'
  }
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>佣金数据中心</span>
        <el-button class="button" type="primary" @click="fetchTransactions" :loading="loading"
          >刷新数据</el-button
        >
      </div>
    </template>
    <el-table :data="transactions" v-loading="loading" style="width: 100%" border stripe>
      <el-table-column prop="order_time" label="下单时间" width="180">
        <template #default="{ row }">
          {{ new Date(row.order_time).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column prop="platform" label="平台" width="100" />
      <el-table-column prop="merchant_name" label="广告名" show-overflow-tooltip />
      <el-table-column prop="sale_amount" label="订单金额" width="120" />
      <el-table-column prop="sale_comm" label="佣金" width="120" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="uid" label="广告ID (UID)" show-overflow-tooltip />
    </el-table>
  </el-card>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}
</style>
