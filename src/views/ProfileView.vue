<script setup lang="ts">
import { ref, onMounted, onUnmounted, h } from 'vue'
import UserProfile from '@/components/UserProfile.vue'
import ApiKeysManager from '@/components/ApiKeysManager.vue'
import AdminPanel from '@/components/AdminPanel.vue'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox, ElDatePicker } from 'element-plus'
import { Plus, Minus, Promotion } from '@element-plus/icons-vue'
import { socket } from '@/socket'
import { getPlatformAccountsAPI, savePlatformAccountsAPI, type PlatformAccount } from '@/api/profile'
import { triggerInitialSyncAPI } from '@/api/index'

const userStore = useUserStore()

// --- 多账户管理状态 ---
const platformAccounts = ref<PlatformAccount[]>([])
const isLoading = ref(false)
const platformOptions = [{ value: 'Linkbux', label: 'Linkbux' }]

const fetchPlatformAccounts = async () => {
  isLoading.value = true
  try {
    const res = await getPlatformAccountsAPI()
    if (res.data.status === 0 && res.data.data.length > 0) {
      platformAccounts.value = res.data.data
    } else {
      platformAccounts.value = [{ platform_name: 'Linkbux', account_name: '', api_token: '' }]
    }
  } catch (error) {
    ElMessage.error('获取账户列表失败')
  } finally {
    isLoading.value = false
  }
}

const addAccountRow = () => {
  platformAccounts.value.push({ platform_name: 'Linkbux', account_name: '', api_token: '' })
}

const removeAccountRow = (index: number) => {
  if (platformAccounts.value.length > 1) {
    platformAccounts.value.splice(index, 1)
  }
}

const handleSaveAccounts = async () => {
  isLoading.value = true
  try {
    const validAccounts = platformAccounts.value.filter(
      acc => acc.account_name.trim() && acc.api_token?.trim()
    )
    if (validAccounts.length === 0 && platformAccounts.value.some(acc => acc.account_name || acc.api_token)) {
      ElMessage.warning('请至少完整填写一个账户的信息（账户名和Token）。')
      isLoading.value = false
      return
    }
    const res = await savePlatformAccountsAPI(validAccounts)
    if (res.data.status === 0) {
      ElMessage.success('账户信息保存成功！')
      await fetchPlatformAccounts()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败，请重试。')
  } finally {
    isLoading.value = false
  }
}

// --- 核心改动 1: 增强进度条与同步功能的状态 ---
const isSyncing = ref(false)
const syncProgress = ref(0)
const syncMessage = ref('')
const syncStatus = ref<'success' | 'exception' | ''>('') // 用于控制进度条颜色
const syncingAccountName = ref<string | null>(null) // 新增：用于追踪当前同步的账户名
const startDate = ref('')

const handleInitialSync = (account: PlatformAccount) => {
  startDate.value = ''
  ElMessageBox({
    title: `为账户 [${account.account_name}] 同步历史数据`,
    message: () => h('div', null, [
      h('p', { style: 'margin-bottom: 10px;' }, '请选择历史数据同步的起始日期。将从该日期开始同步至今。'),
      h(ElDatePicker, {
        modelValue: startDate.value,
        'onUpdate:modelValue': (val) => { startDate.value = val as string },
        type: 'date',
        placeholder: '选择起始日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: 'width: 100%;',
      })
    ]),
    showCancelButton: true,
    confirmButtonText: '开始同步',
    cancelButtonText: '取消',
    beforeClose: async (action, instance, done) => {
      if (action === 'confirm') {
        if (!startDate.value) {
          ElMessage.warning('请选择一个起始日期！')
          return
        }
        instance.confirmButtonLoading = true
        try {
          const res = await triggerInitialSyncAPI(account.id!, startDate.value)
          if (res.data.status === 0) {
            ElMessage.info(res.data.message)
            isSyncing.value = true
            syncingAccountName.value = account.account_name // 设置当前同步的账户名
            syncProgress.value = 0
            syncMessage.value = '任务已启动，正在初始化...'
            syncStatus.value = '' // 重置状态
          }
          done()
        } catch (error: any) {
          ElMessage.error(error.response?.data?.message || '启动同步任务失败')
          done()
        } finally {
          instance.confirmButtonLoading = false
        }
      } else {
        done()
      }
    }
  }).catch(() => { /* 用户点击取消或关闭弹窗 */ })
}

// --- 核心改动 2: 优化 WebSocket 事件监听 ---
onMounted(() => {
  fetchPlatformAccounts()

  // 这个监听器已经可以完美接收后端传来的详细信息，无需改动
  socket.on('sync_progress', (data: { progress: number; message: string }) => {
    isSyncing.value = true
    syncProgress.value = data.progress
    syncMessage.value = data.message
    syncStatus.value = '' // 正常进行中
  })

  socket.on('sync_complete', (data: { message: string }) => {
    syncProgress.value = 100
    syncStatus.value = 'success' // 设置为成功状态（绿色）
    syncMessage.value = data.message
    ElMessage.success(data.message)
    // 2秒后自动隐藏进度条
    setTimeout(() => {
      isSyncing.value = false
      syncingAccountName.value = null
    }, 2000)
  })

  socket.on('sync_error', (data: { message: string }) => {
    syncStatus.value = 'exception' // 设置为失败状态（红色）
    syncMessage.value = data.message
    ElMessage.error(data.message)
    // 5秒后自动隐藏进度条
    setTimeout(() => {
      isSyncing.value = false
      syncingAccountName.value = null
    }, 5000)
  })
})

onUnmounted(() => {
  socket.off('sync_progress')
  socket.off('sync_complete')
  socket.off('sync_error')
})
</script>

<template>
  <div class="profile-view">
    <UserProfile />

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>联盟平台账户管理</span>
        </div>
      </template>
      <el-form :model="platformAccounts" label-position="top" v-loading="isLoading">
        <div v-for="(account, index) in platformAccounts" :key="index" class="account-row">
          <el-form-item label="联盟平台">
            <el-select v-model="account.platform_name" placeholder="选择平台">
              <el-option
                v-for="item in platformOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="联盟账户名 (自定义)">
            <el-input v-model="account.account_name" placeholder="例如: MyAccount01" />
          </el-form-item>
          <el-form-item label="API Token">
            <el-input
              v-model="account.api_token"
              type="password"
              placeholder="粘贴此账户的 API Token"
              show-password
              clearable
            />
          </el-form-item>
          <div class="button-group">
            <el-button
              type="info"
              :icon="Promotion"
              circle
              @click="handleInitialSync(account)"
              :disabled="!account.id || isSyncing"
              title="为此账户同步历史数据"
            />
            <el-button
              type="danger"
              :icon="Minus"
              circle
              @click="removeAccountRow(index)"
              :disabled="platformAccounts.length <= 1"
            />
          </div>
        </div>
        <el-form-item>
          <el-button type="primary" :icon="Plus" @click="addAccountRow">添加账户</el-button>
          <el-button type="success" @click="handleSaveAccounts" :loading="isLoading">保存所有账户</el-button>
        </el-form-item>
      </el-form>

      <div v-if="isSyncing || syncStatus" class="progress-container">
        <div v-if="syncingAccountName" class="sync-account-title">
          正在为账户 [<b>{{ syncingAccountName }}</b>] 同步数据...
        </div>
        <el-progress
          :percentage="syncProgress"
          :stroke-width="15"
          :status="syncStatus"
          striped
          striped-flow
        />
        <span class="progress-message">{{ syncMessage }}</span>
      </div>
    </el-card>

    <ApiKeysManager />
    <AdminPanel v-if="userStore.isAdmin" />
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.account-row {
  display: grid;
  grid-template-columns: 200px 1fr 2fr auto;
  gap: 15px;
  align-items: flex-end;
  margin-bottom: 10px;
}
.button-group {
  display: flex;
  align-items: center;
  padding-bottom: 8px; /* 对齐输入框 */
  gap: 8px;
}
.progress-container {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
.sync-account-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
}
.progress-message {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block;
}

/* 核心改动 4: 为进度条添加平滑过渡效果 */
.progress-container :deep(.el-progress-bar__inner) {
  transition: width 0.6s ease;
}
</style>
