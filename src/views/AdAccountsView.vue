<template>
  <div class="ad-accounts-view link-manager-view">
    <el-card class="filter-card">
        <template #header>
        <div class="card-header">
          <span class="title">Ads账户管理</span>
        </div>
      </template>
      <div class="header-content">
        <div class="filters">
          <el-row :gutter="20" style="width: 100%" align="middle">
            <el-col :span="3">
              <el-select
                v-model="filters.manager_accounts"
                placeholder="经理账户"
                multiple
                clearable
                collapse-tags
                collapse-tags-tooltip
                class="filter-item"
              >
                <el-option v-for="item in managerAccountOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-col>
            <el-col :span="3">
              <el-select
                v-model="filters.affiliate_accounts"
                placeholder="联盟账号"
                multiple
                clearable
                filterable
                collapse-tags
                collapse-tags-tooltip
                class="filter-item"
              >
                <el-option v-for="item in affiliateAccountOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-col>
            <el-col :span="3">
              <el-select
                v-model="filters.affiliate_networks"
                placeholder="所属联盟"
                multiple
                clearable
                collapse-tags
                collapse-tags-tooltip
                class="filter-item"
              >
                <el-option v-for="item in affiliateNetworkOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-input
                v-model="filters.searchText"
                placeholder="按子账户名称或ID搜索"
                clearable
                :prefix-icon="Search"
                class="filter-item search-input"
              />
            </el-col>
            <el-col :span="11">
              <div class="date-actions">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="date-picker"
                />
                <el-button type="primary" :icon="Search" @click="handleSearch" :loading="loading">查询</el-button>
                <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>

   <el-card class="table-card">
      <el-table :data="filteredData" v-loading="loading" border stripe style="width: 100%" height="100%">

       <el-table-column label="子账户名称" width="320" align="left" fixed sortable>
  <template #default="{ row }">
    <!-- 第一行：名称，超出省略号 + 悬浮提示 -->
    <el-tooltip effect="dark" :content="row.sub_account_name" placement="top">
      <div
        style="
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px; /* 比上面的 width 稍小，才会出现省略号 */
        "
      >
        {{ row.sub_account_name }}
      </div>
    </el-tooltip>

    <!-- 第二行：块状标签（无“ID:”/“经理:”字样） -->
    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">
      <el-tag size="small" effect="plain" type="info">
        {{ row.sub_account_id }}
      </el-tag>
      <el-tag size="small" effect="plain" type="success">
        {{ row.manager_account }}
      </el-tag>
      <!-- 如果你还想加一个状态标签，可以解开下面注释（用你现有的字段替换） -->
      <!--
      <el-tag v-if="row.job_status" size="small" :type="getJobStatusType(row.job_status)" effect="light">
        {{ formatJobStatus(row.job_status) }}
      </el-tag>
      -->
    </div>
  </template>
</el-table-column>

        <el-table-column prop="affiliate_account" label="联盟账号" width="120" align="center" sortable show-overflow-tooltip/>
        <el-table-column prop="affiliate_network" label="联盟" width="110" align="center" sortable show-overflow-tooltip/>
        <el-table-column prop="advertiser" label="广告商" width="150" align="center" sortable show-overflow-tooltip/>
        <el-table-column prop="advertiser_id" label="广告ID" width="100" align="center" sortable show-overflow-tooltip/>
        <el-table-column prop="job_status" label="指令状态" width="120" align="center" sortable show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag :type="getJobStatusType(row.job_status)" effect="light">{{ formatJobStatus(row.job_status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="账户状态" width="90" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="flex items-center">
              <el-switch
                v-model="row.editable.account_status"
                active-value="ENABLED"
                inactive-value="PAUSED"
                :disabled="row.account_status === 'REMOVED'"
                @change="handleAccountStatusChange($event, row)"
              />
              <el-tag v-if="row.account_status === 'REMOVED'" type="info" class="ml-2">规避</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="每日预算" width="120" sortable show-overflow-tooltip>
          <template #default="{ row }">
            <el-input-number
              v-model="row.editable.daily_budget"
              :min="0"
              :step="1"
              controls-position="right"
              :disabled="row.account_status === 'REMOVED'"
              @change="handleRowChange(row)"
              style="width: 90px"
            />
          </template>
        </el-table-column>
        <el-table-column label="投放地区" width="250">
          <template #default="{ row }">
            <el-select
              v-model="row.editable.target_region"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              value-key="criterion_id"
              placeholder="请选择地区"
              :disabled="row.account_status === 'REMOVED'"
              @change="handleRowChange(row)"
              style="width: 220px"
            >
              <el-option
                v-for="country in countryOptions"
                :key="country.criterion_id"
                :label="`${country.name_zh} (${country.name})`"
                :value="country"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="实时点击" prop="realtime_clicks" width="110" align="center" sortable/>
        <el-table-column label="实时CVR" width="110" align="center" sortable prop="realtime_cvr">
          <template #default="{ row }">{{ row.realtime_cvr }}%</template>
        </el-table-column>
        <el-table-column label="实时消费" width="110" align="center" sortable prop="realtime_spend">
            <template #default="{ row }">${{ row.realtime_spend.toFixed(2) }}</template>
        </el-table-column>

        <el-table-column label="余额" width="110" align="center" sortable prop="balance">
            <template #default="{ row }">
              <el-link type="primary" @click="openBalanceDialog(row)">
                  <span :class="{'text-red-500 font-bold': parseFloat(row.balance) < 0}">
                      ${{ row.balance }}
                  </span>
              </el-link>
          </template>
        </el-table-column>

        <el-table-column label="消费" width="90" align="center" sortable prop="historical_spend">
          <template #default="{ row }">${{ row.historical_spend.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="点击" prop="historical_clicks" width="90" align="center" sortable/>
        <el-table-column label="CVR" width="90" align="center" sortable prop="historical_cvr">
            <template #default="{ row }">{{ row.historical_cvr }}%</template>
        </el-table-column>
         <el-table-column prop="last_modified_time" label="最后修改时间" width="180" sortable />
        <el-table-column label="佣金" width="90" align="center" fixed="right" sortable prop="commission">
          <template #default="{ row }">${{ row.commission.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="ROI" width="100" align="center" fixed="right" sortable prop="roi">
            <template #default="{ row }">{{ row.roi === 'inf' ? 'N/A' : row.roi + '%' }}</template>
        </el-table-column>


        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              :disabled="!row.isChanged || row.account_status === 'REMOVED'"
              :loading="row.isSaving"
              @click="handleSave(row)"
            >
              保存
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="balanceDialogVisible" title="余额管理" width="500px">
        <el-form :model="balanceForm" label-width="100px" v-if="currentAccount">
            <el-form-item label="子账户">
                <span>{{ currentAccount.sub_account_name }}</span>
            </el-form-item>
            <el-form-item label="初始余额">
                <el-input-number v-model="balanceForm.initial_balance" :precision="2" :step="10" placeholder="仅首次设置有效" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="充值金额">
                <el-input-number v-model="balanceForm.recharge_amount" :precision="2" :step="10" placeholder="输入本次充值额" style="width: 100%;" />
            </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="balanceForm.note" type="textarea" placeholder="可选"/>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="balanceDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitBalance" :loading="balanceSaving">
                    确认提交
                </el-button>
            </span>
        </template>
    </el-dialog>

    <el-dialog v-model="intervalDialogVisible" title="设置换链接循环时间" width="500px" :close-on-click-modal="false" @closed="handleDialogClose">
      <el-form :model="editingRowRef" label-width="120px" v-if="editingRowRef">
        <el-form-item label="执行间隔(分钟)">
          <el-input-number v-model="tempInterval" :min="1" placeholder="请输入大于0的整数"></el-input-number>
        </el-form-item>
        <p style="padding-left: 120px; color: #999;">此设置仅对已配置换链接的账户有效。</p>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelIntervalDialog">取消</el-button>
          <el-button type="primary" @click="confirmIntervalDialog">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { getAdAccountsDashboardAPI, updateAdAccountAPI, manageBalanceAPI, getCountriesAPI } from '@/api'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import _ from 'lodash'

// --- 类型定义 ---
interface CountryOption {
  criterion_id: number;
  name_zh: string;
  name: string;
}

interface AccountData {
  id: number;
  sub_account_name: string;
  sub_account_id: string;
  manager_account: string;
  affiliate_account: string;
  affiliate_network: string;
  advertiser: string;
  advertiser_id: string;
  job_status: string;
  account_status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  daily_budget: number;
  target_region: CountryOption[];
  raw_target_region_ids?: number[];
  last_modified_time: string;
  realtime_clicks: number;
  realtime_cvr: string;
  realtime_spend: number;
  balance: string;
  historical_spend: number;
  historical_clicks: number;
  historical_cvr: string;
  commission: number;
  roi: string;
  editable: {
    account_status: 'ENABLED' | 'PAUSED';
    daily_budget: number;
    target_region: CountryOption[];
    change_interval_minutes?: number | null;
  };
  isChanged: boolean;
  isSaving: boolean;
  link_job_id: number | null;
  change_interval_minutes: number | null;
}

// --- 响应式状态 ---
const allData = ref<AccountData[]>([])
const loading = ref(false)
const dateRange = ref<[string, string]>([
  dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
])

const filters = reactive({
  manager_accounts: [] as string[],
  affiliate_accounts: [] as string[],
  affiliate_networks: [] as string[],
  searchText: ''
})

const countryOptions = ref<CountryOption[]>([])
const balanceDialogVisible = ref(false)
const balanceSaving = ref(false)
const currentAccount = ref<AccountData | null>(null)
const balanceForm = reactive({
  sub_account_id: '',
  initial_balance: undefined as number | undefined,
  recharge_amount: undefined as number | undefined,
  note: ''
})

const intervalDialogVisible = ref(false)
const editingRowRef = ref<AccountData | null>(null)
const tempInterval = ref(60)

// --- 计算属性 ---
const managerAccountOptions = computed(() => _.uniq(allData.value.map(item => item.manager_account).filter(Boolean)))
const affiliateAccountOptions = computed(() => _.uniq(allData.value.map(item => item.affiliate_account).filter(Boolean)))
const affiliateNetworkOptions = computed(() => _.uniq(allData.value.map(item => item.affiliate_network).filter(Boolean)))

const filteredData = computed(() => {
  let data = allData.value;
  if (filters.manager_accounts.length > 0) {
    data = data.filter(item => filters.manager_accounts.includes(item.manager_account))
  }
  if (filters.affiliate_accounts.length > 0) {
    data = data.filter(item => filters.affiliate_accounts.includes(item.affiliate_account))
  }
  if (filters.affiliate_networks.length > 0) {
    data = data.filter(item => filters.affiliate_networks.includes(item.affiliate_network))
  }
  if (filters.searchText) {
    const searchTextLower = filters.searchText.toLowerCase()
    data = data.filter(item =>
      item.sub_account_name.toLowerCase().includes(searchTextLower) ||
      item.sub_account_id.toLowerCase().includes(searchTextLower)
    )
  }
  return data
})

// --- 方法 ---
const fetchDashboardData = async () => {
  try {
    const params = {
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    }
    const res = await getAdAccountsDashboardAPI(params)
    const list = Array.isArray(res?.data?.data) ? res.data.data : []

    allData.value = list.map((item: any) => {
      const rawIds: number[] = Array.isArray(item.target_region)
        ? item.target_region.map(Number).filter(Number.isFinite)
        : []
      const toCountryObject = (id: number) =>
        countryOptions.value.find(c => Number(c.criterion_id) === Number(id))
      const regionObjects: CountryOption[] = rawIds
        .map(toCountryObject)
        .filter(Boolean) as CountryOption[]

      return {
        ...item,
        target_region: regionObjects,
        raw_target_region_ids: rawIds,
        editable: {
          account_status: item.account_status,
          daily_budget: item.daily_budget,
          target_region: [...regionObjects],
          change_interval_minutes: item.change_interval_minutes
        },
        isChanged: false,
        isSaving: false,
      } as AccountData
    })
  } catch (error) {
    console.error('获取看板数据失败:', error)
  }
}

const fetchCountryOptions = async () => {
    try {
        const res = await getCountriesAPI()
        countryOptions.value = Array.isArray(res?.data?.data) ? res.data.data:[]
    } catch (error) {
        ElMessage.error('获取地区列表失败');
        console.error('获取地区列表失败:', error)
    }
}

const handleSearch = async () => {
  loading.value = true;
  try {
    await fetchCountryOptions();
    await fetchDashboardData();
  } catch (error) {
    ElMessage.error("查询数据失败");
    console.error("查询过程中出错:", error);
  } finally {
    loading.value = false;
  }
}

const resetFilters = () => {
  filters.manager_accounts = []
  filters.affiliate_accounts = []
  filters.affiliate_networks = []
  filters.searchText = ''
}

const handleRowChange = (row: AccountData) => {
  const originalIds = (row.raw_target_region_ids ?? []).sort();
  const editableIds = (row.editable.target_region ?? []).map(r => r.criterion_id).sort();
  const regionChanged = !_.isEqual(originalIds, editableIds);
  const statusChanged = row.account_status !== row.editable.account_status;
  const budgetChanged = row.daily_budget !== row.editable.daily_budget;
  const intervalChanged = row.change_interval_minutes !== row.editable.change_interval_minutes;

  row.isChanged = regionChanged || statusChanged || budgetChanged || intervalChanged;
}

const handleAccountStatusChange = (newState: 'ENABLED' | 'PAUSED', row: AccountData) => {
  if (row.link_job_id) {
    if (newState === 'ENABLED') {
      editingRowRef.value = row;
      tempInterval.value = row.editable.change_interval_minutes || 60;
      intervalDialogVisible.value = true;
    } else {
      row.editable.change_interval_minutes = null;
    }
  }
  handleRowChange(row);
}

const confirmIntervalDialog = () => {
  if (editingRowRef.value) {
    editingRowRef.value.editable.change_interval_minutes = tempInterval.value;
    handleRowChange(editingRowRef.value);
  }
  intervalDialogVisible.value = false;
}

// ▼▼▼ 核心修正 2: 修改 cancelIntervalDialog 函数 ▼▼▼
const cancelIntervalDialog = () => {
  if (editingRowRef.value) {
    // 它的职责就是：将开关拨回去
    editingRowRef.value.editable.account_status = 'PAUSED';
  }
  // 然后关闭弹窗
  intervalDialogVisible.value = false;
}
// ▲▲▲ 核心修正 2 结束 ▲▲▲

// ▼▼▼ 核心修正 3: 新增 handleDialogClose 函数 ▼▼▼
// 这是一个纯粹的清理函数
const handleDialogClose = () => {
  // 无论弹窗如何关闭，都清空当前正在编辑的行引用
  editingRowRef.value = null;
}
// ▲▲▲ 核心修正 3 结束 ▲▲▲


const handleSave = async (row: AccountData) => {
  row.isSaving = true
  try {
    const payload = {
      sub_account_id: row.sub_account_id,
      account_status: row.editable.account_status,
      daily_budget: row.editable.daily_budget,
      target_region: (row.editable.target_region ?? []).map(r => r.criterion_id),
      link_job_id: row.link_job_id,
      change_interval_minutes: row.editable.change_interval_minutes ?? null
    }

    await updateAdAccountAPI(row.id, payload)
    ElMessage.success('指令已提交，状态将更新为待处理')

    row.job_status = 'PENDING_UPDATE'
    row.isChanged = false
    row.raw_target_region_ids = [...payload.target_region]
    row.target_region = [...row.editable.target_region]
    row.account_status = row.editable.account_status
    row.daily_budget = row.editable.daily_budget
    row.change_interval_minutes = row.editable.change_interval_minutes ?? null;

  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    row.isSaving = false
  }
}

const openBalanceDialog = (row: AccountData) => {
    currentAccount.value = row
    balanceForm.sub_account_id = row.sub_account_id
    balanceForm.initial_balance = undefined
    balanceForm.recharge_amount = undefined
    balanceForm.note = ''
    balanceDialogVisible.value = true
}

const submitBalance = async () => {
    if (balanceForm.initial_balance === undefined && balanceForm.recharge_amount === undefined) {
        ElMessage.warning('初始余额和充值金额请至少填写一项')
        return
    }
    balanceSaving.value = true
    try {
        await manageBalanceAPI({ ...balanceForm })
        ElMessage.success('余额操作成功！')
        balanceDialogVisible.value = false
        await handleSearch()
    } catch (error) {
        console.error('余额操作失败:', error)
    } finally {
        balanceSaving.value = false
    }
}

const getJobStatusType = (status: string) => {
  const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    'COMPLETED': 'success', 'PENDING_UPDATE': 'warning', 'PROCESSING': 'warning', 'FAILED': 'danger', 'DRAFT': 'info',
  }
  return statusMap[status] || 'info'
}

const formatJobStatus = (status: string) => {
  const statusTextMap: Record<string, string> = {
    'COMPLETED': '已完成', 'PENDING_UPDATE': '待处理', 'PROCESSING': '处理中', 'FAILED': '失败', 'DRAFT': '草稿',
  }
  return statusTextMap[status] || '未知'
}

onMounted(() => {
  handleSearch();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');

.link-manager-view {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f7f8fa;
  padding: 24px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
/* 样式与您提供的代码一致，无需修改 */

.filter-card {
  margin-bottom: 1rem;
  flex-shrink: 0;
}
.card-header .title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #303133;
}
.header-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.view-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
}
.filters .el-row {
  align-items: center;
}
.filters .el-col {
  display: flex;
}
.filter-item {
  width: 100%;
}
.search-input {
  width: 100%;
}
.date-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  width: 100%;
}
.table-container {
  flex-grow: 1;
  overflow: hidden;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}
/* 表格卡片样式 */
.table-card {
  flex: 1;
  border-radius: 5px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 30px;
}

:deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* 深度选择器美化Element Plus组件 */
:deep(.el-table) {
  color: #333;
  font-size: 14px;
  flex: 1;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: 500;
}

:deep(.el-table .el-table__cell) {
  padding: 14px 12px;
  line-height: 1.5; /* 增加行高，解决文字拥挤问题 */
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: #fafcfe;
}

:deep(.el-table__row:hover) {
    background-color: #ecf5ff !important;
}

.el-button--primary {
    --el-button-bg-color: #409eff;
    --el-button-hover-bg-color: #66b1ff;
    --el-button-active-bg-color: #337ecc;
}
.el-input__wrapper {
    box-shadow: 0 0 0 1px var(--el-input-hover-border-color) inset;
}
</style>
