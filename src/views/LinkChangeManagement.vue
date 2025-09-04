<template>
  <div class="link-manager-view">
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span class="title">换链接程序管理</span>
           <el-alert type="success" :closable="false" class="summary-alert">
      <template #title>
        <span class="summary-text">已配置换链接任务总数：<span class="summary-count">{{ activeJobsCount }}</span> 条</span>
      </template>
    </el-alert>
        </div>
      </template>
      <!-- 筛选区域 -->
      <el-form :model="filters" label-position="top">
        <el-row :gutter="20">
          <el-col :span="4">
             <el-form-item>
                <el-select v-model="filters.manager_names" placeholder="经理账户" multiple clearable collapse-tags collapse-tags-tooltip style="width: 100%;">
                    <el-option v-for="item in managerAccountOptions" :key="item" :label="item" :value="item" />
                </el-select>
             </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item >
                <el-select v-model="filters.affiliate_accounts" placeholder="联盟账号" multiple clearable filterable collapse-tags collapse-tags-tooltip style="width: 100%;">
                    <el-option v-for="item in affiliateAccountOptions" :key="item" :label="item" :value="item" />
                </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item>
                <el-select v-model="filters.affiliate_networks" placeholder="所属联盟" multiple clearable collapse-tags collapse-tags-tooltip style="width: 100%;">
                    <el-option v-for="item in affiliateNetworkOptions" :key="item" :label="item" :value="item" />
                </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item >
              <el-input v-model="filters.search_query" placeholder="子账户名称或ID" clearable :prefix-icon="SearchIcon" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item >
              <div class="action-buttons">
                <el-button type="primary" :icon="SearchIcon" @click="fetchData" :loading="loading">查询</el-button>
                <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>



    <el-card class="table-card">
       <el-table
         :data="processedTableData"
         :row-class-name="tableRowClassName"
         border
         stripe
         style="width: 100%"
         v-loading="loading"
         height="calc(100vh - 370px)"
       >
        <!-- Columns -->
       <el-table-column label="子账户信息" width="340px" align="left" fixed sortable>
  <template #default="{ row }">
    <!-- 第一行：子账户名称，带省略号和 Tooltip -->
    <el-tooltip effect="dark" :content="row.sub_account_name" placement="top">
      <div
        style="
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        "
      >
        {{ row.sub_account_name }}
      </div>
    </el-tooltip>

    <!-- 第二行：标签 -->
    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">
      <el-tag size="small" effect="plain" type="info">
        {{ row.sub_account_id }}
      </el-tag>
      <el-tag size="small" effect="plain" type="success">
        {{ row.manager_name }}
      </el-tag>
    </div>
  </template>
</el-table-column>
        <el-table-column prop="campaign_name" label="广告系列名" width="150px" sortable show-overflow-tooltip />
        <el-table-column prop="affiliate_account" label="联盟账户" width="150px" sortable show-overflow-tooltip />
        <el-table-column prop="affiliate_network" label="平台" width="110px" sortable show-overflow-tooltip />
        <el-table-column prop="advertiser_name" label="广告名" width="150px" sortable show-overflow-tooltip />
        <el-table-column prop="advertiser_id" label="广告ID" width="120px" sortable show-overflow-tooltip />
        <el-table-column prop="country_code_from_name" width="110px" label="国家" sortable />
        <el-table-column label="联盟广告链接" width="300px">
          <template #default="{ row }">
            <el-select v-model="row.affiliate_offer_link" filterable allow-create default-first-option placeholder="请选择或输入链接" @focus="getSuggestions(row)" style="width: 100%;">
              <el-option v-for="item in row.offerSuggestions || []" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="追溯信息" width="240px" >
            <template #default="{ row }">
              <el-input v-model="row.affiliate_offer_params" @focus="autoFillParams(row)"></el-input>
            </template>
        </el-table-column>
        <el-table-column label="广告主链接" width="250px">
            <template #default="{ row }">
              <el-input v-model="row.advertiser_link"></el-input>
            </template>
        </el-table-column>
        <el-table-column label="代理国家" width="110px">
            <template #default="{ row }">
              <el-input v-model="row.proxy_country"></el-input>
            </template>
        </el-table-column>
        <el-table-column label="换链接间隔" width="150px">
            <template #default="{ row }">
              <el-select v-model="row.change_interval_minutes" filterable allow-create default-first-option placeholder="请选择或输入分钟数">
                <el-option label="5分钟" :value="5" />
                <el-option label="10分钟" :value="10" />
                <el-option label="15分钟" :value="15" />
                <el-option label="30分钟" :value="30" />
                <el-option label="60分钟" :value="60" />
                <el-option label="120分钟" :value="120" />
              </el-select>
            </template>
        </el-table-column>
        <el-table-column label="来源(Referer)" width="160px">
            <template #default="{ row }">
              <el-select v-model="row.referer_link" filterable allow-create default-first-option placeholder="请选择或输入">
                <el-option label="Facebook" value="http://facebook.com/" />
                <el-option label="X.com" value="https://x.com/" />
                <el-option label="TikTok" value="https://www.tiktok.com/" />
                <el-option label="Instagram" value="https://www.instagram.com/" />
              </el-select>
            </template>
        </el-table-column>
        <el-table-column prop="status" label="任务状态" width="150px" sortable>
            <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)">{{ row.status || '未知' }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="error_message" label="错误信息" width="110px" show-overflow-tooltip />
        <el-table-column prop="ads_last_operation" label="Ads最后操作" width="160px" sortable>
            <template #default="{ row }">
                <el-tag v-if="row.ads_last_operation" :type="getOperationTagType(row.ads_last_operation)">
                    {{ row.ads_last_operation }}
                </el-tag>
                <el-tag v-else type="info">无记录</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="ads_last_operation_time" label="Ads最后更改时间" width="200px"  sortable show-overflow-tooltip />
        <el-table-column prop="last_generated_link" label="最后生成的链接"width="200px"  show-overflow-tooltip />
        <el-table-column prop="last_generated_time" label="最后生成的时间" width="200px" sortable show-overflow-tooltip />
        <el-table-column prop="generated_link_1" label="备用链接1" width="200px" show-overflow-tooltip />
        <el-table-column prop="generated_link_2" label="备用链接2" width="200px" show-overflow-tooltip />
        <el-table-column fixed="right" label="操作" width="120px" align="center">
          <template #default="{ row }">
            <el-button @click="saveRow(row)" type="primary" :icon="Upload" size="small" :loading="row.isSaving">保存</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { getManagementDataAPI, getOfferSuggestionsAPI, saveLinkJobAPI } from '@/api'
import { ElMessage } from 'element-plus'
import { Search as SearchIcon, Refresh, User, PriceTag, CollectionTag, Upload } from '@element-plus/icons-vue'
import _ from 'lodash'
import dayjs from 'dayjs'

// ▼▼▼ 核心修正 1: 恢复完整的 TypeScript 接口 ▼▼▼
interface LinkJob {
    id: number;
    manager_name: string;
    sub_account_id: string;
    sub_account_name: string;
    campaign_name: string;
    affiliate_account: string;
    affiliate_network: string;
    advertiser_name: string;
    country_code_from_name: string;
    advertiser_id: string;
    error_message: string | null;
    affiliate_offer_link: string;
    affiliate_offer_params: string;
    advertiser_link: string;
    proxy_country: string;
    change_interval_minutes: number | null; // 允许为 null
    referer_link: string;
    status: string;
    ads_last_operation: string | null;
    ads_last_operation_time: string | null;
    last_generated_link: string | null;
    last_generated_time: string | null;
    generated_link_1: string | null;
    generated_link_2: string | null;
    offerSuggestions?: { label: string; value: string }[];
    isSaving?: boolean;
    operationTimeTimestamp?: number;
    sortPriority?: number;
    isRed?: boolean;
    isOrange?: boolean;
}

const loading = ref(false)
const allTableData = ref<LinkJob[]>([]) // 存储从后端获取的完整数据
const filters = reactive({
  manager_names: [] as string[],
  affiliate_accounts: [] as string[],
  affiliate_networks: [] as string[],
  search_query: ''
})

// 下拉框选项
const managerAccountOptions = computed(() => _.uniq(allTableData.value.map(item => item.manager_name).filter(Boolean)))
const affiliateAccountOptions = computed(() => _.uniq(allTableData.value.map(item => item.affiliate_account).filter(Boolean)))
const affiliateNetworkOptions = computed(() => _.uniq(allTableData.value.map(item => item.affiliate_network).filter(Boolean)))

// 汇总信息
const activeJobsCount = computed(() => {
    return allTableData.value.filter(item => item.change_interval_minutes != null && item.change_interval_minutes > 0).length;
});

// 核心处理逻辑：先筛选，再添加标记，最后排序
const processedTableData = computed(() => {
  // 1. 前端筛选
  let data = allTableData.value.filter(item => {
    const managerMatch = filters.manager_names.length === 0 || filters.manager_names.includes(item.manager_name);
    const affiliateAccountMatch = filters.affiliate_accounts.length === 0 || filters.affiliate_accounts.includes(item.affiliate_account);
    const affiliateNetworkMatch = filters.affiliate_networks.length === 0 || filters.affiliate_networks.includes(item.affiliate_network);
    const searchMatch = !filters.search_query ||
        item.sub_account_name.toLowerCase().includes(filters.search_query.toLowerCase()) ||
        item.sub_account_id.toLowerCase().includes(filters.search_query.toLowerCase());
    return managerMatch && affiliateAccountMatch && affiliateNetworkMatch && searchMatch;
  });

  // 2. 预处理数据
  const now = dayjs();
  const augmentedData = data.map(row => {
    const isRed = !!(row.generated_link_1 && row.generated_link_1.includes('失效Offer'));
    let isOrange = false;
    if (!isRed && row.ads_last_operation_time && row.change_interval_minutes && row.change_interval_minutes > 0) {
      const lastOpTime = dayjs(row.ads_last_operation_time);
      if (lastOpTime.isValid()) {
        const diffInMinutes = now.diff(lastOpTime, 'minute');
        if (diffInMinutes > row.change_interval_minutes * 2) {
          isOrange = true;
        }
      }
    }
    let sortPriority = 2;
    if (isRed) sortPriority = 0;
    else if (isOrange) sortPriority = 1;

    return {
      ...row,
      operationTimeTimestamp: row.ads_last_operation_time ? dayjs(row.ads_last_operation_time).valueOf() : 0,
      sortPriority,
      isRed,
      isOrange,
    };
  });

  // 3. 多级排序
  return augmentedData.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    if (a.manager_name !== b.manager_name) return a.manager_name.localeCompare(b.manager_name);
    return (b.operationTimeTimestamp ?? 0) - (a.operationTimeTimestamp ?? 0);
  });
});

// ▼▼▼ 核心修正 2: 修正 API 调用，始终传递 filters 对象 ▼▼▼
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getManagementDataAPI(filters)
    allTableData.value = (res.data.data || []).map((item: any) => ({
      ...item,
      proxy_country: item.proxy_country || item.country_code_from_name || 'US',
      offerSuggestions: [],
      isSaving: false,
    }))
  } catch (error) {
    ElMessage.error('数据加载失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 绑定行样式
const tableRowClassName = ({ row }: { row: LinkJob }) => {
  if (row.isRed) return 'red-row';
  if (row.isOrange) return 'orange-row';
  return '';
};

const resetFilters = () => {
    filters.manager_names = [];
    filters.affiliate_accounts = [];
    filters.affiliate_networks = [];
    filters.search_query = '';
    fetchData(); // 重置后重新获取数据
}

// ... 您的其他函数 ...
const getSuggestions = async (row: LinkJob) => {
  if (row.offerSuggestions && row.offerSuggestions.length > 0) return
  if (!row.affiliate_network || !row.advertiser_id) return
  try {
    const res = await getOfferSuggestionsAPI({
      affiliate_network: row.affiliate_network,
      advertiser_id: row.advertiser_id
    })
    row.offerSuggestions = res.data.data.offer_links
    if (!row.advertiser_link) {
       row.advertiser_link = res.data.data.advertiser_link
    }
  } catch (error) { ElMessage.error('获取链接建议失败') }
}

const autoFillParams = (row: LinkJob) => {
    if (row.affiliate_offer_params) return
    const network = row.affiliate_network ? row.affiliate_network.toUpperCase() : '';
    if (['PM', 'PB', 'LB'].includes(network)) {
        if(row.affiliate_account) {
             row.affiliate_offer_params = `&uid=${row.affiliate_account}_date_`;
        }
    }
}

const saveRow = async (row: LinkJob) => {
    row.isSaving = true;
    try {
        const required = ['affiliate_offer_link', 'advertiser_link', 'proxy_country'];
        for(const field of required) {
            if(!row[field as keyof LinkJob]) {
                ElMessage.error(`字段 [${field}] 是必填项！`);
                row.isSaving = false;
                return;
            }
        }
         const { manager_name, ...restOfRow } = row;
          const payload = {
            ...restOfRow,
            mcc_name: manager_name
        };
        const res = await saveLinkJobAPI(payload);
        ElMessage.success(res.data.message || '保存成功！');
        await fetchData();
    } catch (error) {
         console.error(error);
    } finally {
        row.isSaving = false;
    }
}

const getStatusTagType = (status: string) => {
    if (!status) return 'info';
    if (status.includes('成功') || status.includes('运行中')) return 'success';
    if (status.includes('失败') || status.includes('错误')) return 'danger';
    if (status.includes('暂停') || status.includes('待定')) return 'warning';
    return 'primary';
}

const getOperationTagType = (operation: string) => {
    if (!operation) return 'info';
    const op = operation.toUpperCase();
    if (op.includes('UPDATE') || op.includes('CREATE')) return 'primary';
    if (op.includes('PAUSE') || op.includes('STOP')) return 'warning';
    if (op.includes('REMOVE') || op.includes('DELETE')) return 'danger';
    return 'success';
}

onMounted(() => {
  fetchData()
})
</script>


<style scoped>
/* 引入外部字体 */
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

/* 筛选卡片样式 */
.filter-card {
  border-radius: 5px;
  border: none;
  margin-bottom: 15px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-header .title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #303133;
}

.el-form[label-position="top"] :deep(.el-form-item) {
  margin-bottom: 0 !important;
}
.el-form-item--label-top{
    margin-bottom: 0 !important;
}

.action-buttons {
  display: flex;
  gap: 10px;

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
.summary-alert{
width: 225px;
    float: right;
}
</style>
