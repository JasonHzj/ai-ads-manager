<template>
  <el-card class="box-card">
    <template #header>
      <div class="card-header">
        <span>账户列表与广告管理</span>
        <div  class="header-actions">
          <!-- ▼▼▼ 1. 升级为手动触发的 el-upload 组件 ▼▼▼ -->
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept=".xlsx, .xls"
          >
            <template #trigger>
              <el-button type="success">批量AI生成</el-button>
            </template>
          </el-upload>
          <!-- ▲▲▲ 修改结束 ▲▲▲ -->
          <el-button
            type="primary"
            @click="handleSubmitDrafts"
            :disabled="selectedAccounts.length === 0"
          >
            提交草稿
          </el-button>
           <el-button
            type="danger"
            @click="handleBatchDelete"
            :disabled="selectedAccounts.length === 0"
          >
            批量删除
          </el-button>
        </div>
      </div>
    </template>

    <div class="filter-container">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-row :gutter="20" style="width: 100%">
          <el-col :span="5">
            <el-form-item label="经理账户">
              <el-select
                v-model="filters.selectedManagers"
                multiple
                clearable
                placeholder="可多选"
                style="width: 100%"
              >
                <el-option
                  v-for="manager in options.managers"
                  :key="manager"
                  :label="manager"
                  :value="manager"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="联盟账号">
              <el-select
                v-model="filters.selectedAffiliateAccounts"
                multiple
                clearable
                placeholder="可多选"
                style="width: 100%"
              >
                <el-option
                  v-for="acc in options.affiliateAccounts"
                  :key="acc"
                  :label="acc"
                  :value="acc"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="3">
            <el-form-item label="所属联盟">
              <el-select
                v-model="filters.selectedNetworks"
                multiple
                clearable
                placeholder="可多选"
                style="width: 100%"
              >
                <el-option
                  v-for="network in options.networks"
                  :key="network"
                  :label="network"
                  :value="network"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="3">
            <el-form-item label="占用状态">
              <el-select
                v-model="filters.campaignStatus"
                placeholder="选择状态"
                style="width: 100%"
              >
                <el-option label="全部状态" value="all" />
                <el-option label="空账户" value="empty" />
                <el-option label="已占用" value="occupied" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="搜索">
              <el-input
                v-model="filters.searchTerm"
                placeholder="按子账户名称或ID模糊搜索"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <el-table
      :data="filteredAccounts"
      style="width: 100%"
      v-loading="loading"
      border
      height="calc(100vh - 320px)"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" fixed />
      <el-table-column
        prop="sub_account_name"
        label="子账户名称"
        width="250"
        show-overflow-tooltip
        fixed
      />
      <el-table-column prop="sub_account_id" label="子账户ID" width="120" />
      <el-table-column prop="manager_name" label="经理账户" width="100" />
      <el-table-column prop="affiliate_account" label="联盟账号" width="90" />
      <el-table-column prop="affiliate_network" label="所属联盟" width="90" />
      <el-table-column label="广告商" width="90" show-overflow-tooltip>
        <template #default="scope">
          {{ getAdvertiserName(scope.row) }}
        </template>
      </el-table-column>
      <el-table-column label="占用状态" width="90" align="center">
        <template #default="scope">
          <el-tag :type="getCampaignStatus(scope.row.campaigns_data).type" effect="dark">
            {{ getCampaignStatus(scope.row.campaigns_data).text }}
          </el-tag>
        </template>
      </el-table-column>
        <el-table-column label="指令状态" width="90" align="center">
        <template #default="scope">
          <el-tooltip
            v-if="scope.row.job_status === 'FAILED' && scope.row.job_result_message"
            class="box-item"
            effect="dark"
            :content="scope.row.job_result_message"
            placement="top"
          >
            <el-tag :type="getJobStatus(scope.row.job_status).type">
              {{ getJobStatus(scope.row.job_status).text }}
            </el-tag>
          </el-tooltip>

          <template v-else>
            <el-tag v-if="scope.row.job_status" :type="getJobStatus(scope.row.job_status).type">
              {{ getJobStatus(scope.row.job_status).text }}
            </el-tag>
            <span v-else>--</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column prop="account_status" label="账户状态" width="90" align="center">
        <template #default="scope">
          <el-tag
            :type="scope.row.account_status === 'ENABLED' ? 'success' : (scope.row.account_status === 'SHELVED' ? 'danger' : 'info')"
          >
            {{ scope.row.account_status === 'ENABLED' ? '启用' : (scope.row.account_status === 'SHELVED' ? '规避' : '暂停') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="每日预算" width="90" align="right">
        <template #default="scope">{{ formatBudget(scope.row) }}</template>
      </el-table-column>
      <el-table-column label="投放地区" width="180" show-overflow-tooltip>
        <template #default="scope">{{ getLocations(scope.row.campaigns_data) }}</template>
      </el-table-column>
      <el-table-column label="最后修改时间" width="180">
       <template #default="scope">
          {{ formatTime(scope.row.job_processed_at || scope.row.last_manual_update) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" size="small" @click="handleCreate(scope.row)"
            >新增</el-button
          >
          <el-button link type="success" size="small" @click="handleEdit(scope.row)"
            >修改</el-button
          >
          <el-button link type="danger" size="small" @click="handleDelete(scope.row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <AdCampaignDrawer
      :visible="drawer.visible"
      :account="drawer.selectedAccount"
      :mode="drawer.mode"
      @close="closeDrawer"
      @success="onDrawerSuccess"
    />
    <!-- ▼▼▼ 2. 新增一个用于显示处理进度的对话框 ▼▼▼ -->
    <el-dialog v-model="progress.visible" title="批量处理中..." :close-on-click-modal="false" :show-close="false" width="50%">
      <div class="progress-content">
        <p>正在处理第 {{ progress.current }} / {{ progress.total }} 条记录：</p>
        <p>子账户ID: {{ progress.currentAccount }}</p>
        <el-progress :percentage="progress.percentage" :stroke-width="20" striped striped-flow />
        <p v-if="progress.statusText" class="status-text">{{ progress.statusText }}</p>
      </div>
    </el-dialog>
    <!-- ▲▲▲ 新增结束 ▲▲▲ -->
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { getAccountsAPI, submitJobsAPI, generateAIContentAPI, saveDraftAPI, requestDeleteJobAPI, requestBatchDeleteAPI } from '@/api'
import * as XLSX from 'xlsx';
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadInstance } from 'element-plus'
import AdCampaignDrawer from '@/components/AdCampaignDrawer.vue'
import { socket } from '@/socket'; // 导入我们创建的共享socket实例
import { useAdOptions } from '@/composables/useAdOptions' // 1. 导入 useAdOptions 以获取映射数据
import { useUserStore } from '@/stores/user' // 1. 导入 useUserStore

// TypeScript接口定义
interface Campaign {
  budget?: number
  locations: string[]
  [key: string]: any
}
interface Account {
  id: number
  manager_name: string
  sub_account_id: string
  sub_account_name: string
  account_status: 'ENABLED' | 'PAUSED'
  affiliate_account: string | null
  affiliate_network: string | null
  currency_code: 'USD' | 'CNY' | 'HKD' | string | null
  campaigns_data: Campaign[] | null
  last_manual_update: string | null
  job_id?: number | null
  job_status?: string | null
  advertiser_name?: string | null
  job_payload?: any | null
  job_processed_at?: string | null
  job_result_message?: string | null; // 新增字段
}

const allAccounts = ref<Account[]>([])
const loading = ref(true)
const filters = reactive({
  selectedManagers: [] as string[],
  selectedAffiliateAccounts: [] as string[],
  selectedNetworks: [] as string[],
  campaignStatus: 'all',
  searchTerm: '',
})
const selectedAccounts = ref<Account[]>([])
const uploadRef = ref<UploadInstance>()
const userStore = useUserStore() // 2. 获取 userStore 实例

// 4. 新增用于控制进度条的状态
const progress = reactive({
  visible: false,
  total: 0,
  current: 0,
  percentage: 0,
  currentAccount: '',
  statusText: ''
})

// --- ▼▼▼ 3. 新增批量删除的处理函数 ▼▼▼ ---
const handleBatchDelete = async () => {
  // 筛选出所有被勾选的、且存在指令记录的任务
  const jobsToDelete = selectedAccounts.value.filter(acc => acc.job_id);

  if (jobsToDelete.length === 0) {
    ElMessage.warning('请至少勾选一个包含指令记录的账户进行删除操作！');
    return;
  }

  // 提取这些任务的 ID
  const jobIds = jobsToDelete.map(acc => acc.job_id!);

  try {
    await ElMessageBox.confirm(
      `您共勾选了 ${jobIds.length} 项，确定要全部删除吗？此操作将提交删除指令，由Ads脚本执行。`,
      '危险操作确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    // 调用批量删除API
    const res = await requestBatchDeleteAPI(jobIds);
    if (res.data.status === 0) {
      ElMessage.success(res.data.message || '批量删除请求提交成功！');
      // 成功后无需手动刷新，WebSocket会自动更新列表
    } else {
      ElMessage.error(res.data.message || '批量删除请求提交失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交批量删除请求时发生错误:', error);
    } else {
      ElMessage.info('操作已取消');
    }
  }
};
// --- ▲▲▲ 新增函数结束 ▲▲▲ ---
const handleSelectionChange = (selection: Account[]) => {
  selectedAccounts.value = selection
}

const handleSubmitDrafts = async () => {
  const draftsToSubmit = selectedAccounts.value.filter(
    (acc) => acc.job_status === 'DRAFT' && acc.job_id
  )
  if (draftsToSubmit.length === 0) {
    ElMessage.warning('请至少勾选一个状态为“草稿”的任务进行提交！')
    return
  }
  const jobIds = draftsToSubmit.map((acc) => acc.job_id!)
  try {
    await ElMessageBox.confirm(
      `您共勾选了 ${jobIds.length} 个草稿，确定要提交吗？提交后将由Ads脚本进行处理。`,
      '请确认',
      { confirmButtonText: '确定提交', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await submitJobsAPI(jobIds)
    if (res.data.status === 0) {
      ElMessage.success(res.data.message || '提交成功！任务已进入待处理队列。')
      // 提交成功后无需手动刷新，WebSocket会自动通知并更新列表
    } else {
      ElMessage.error(res.data.message || '提交失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交草稿时发生错误:', error)
    }
  }
}
// 2. 使用 useAdOptions 获取国家和语言的完整列表
const { countries, languages: allLanguages } = useAdOptions();

// --- ▼▼▼ 3. 核心：处理文件上传和批量AI生成的新函数 ▼▼▼ ---
const handleFileChange = async (file: any) => {
  const reader = new FileReader();
  reader.onload = async (e: any) => {
    try {
      // --- 准备“翻译词典” ---
      // 关键字匹配类型词典
      const matchTypeMap: { [key: string]: string } = {
        '完全匹配': 'EXACT',
        '词组匹配': 'PHRASE',
        '广泛匹配': 'BROAD',
      };
      // 国家名称到ID的词典 (动态生成)
      const locationMap = new Map(countries.value.map(c => [c.name_zh, c.criterion_id]));
      // 语言名称到ID的词典 (动态生成)
      const languageMap = new Map(allLanguages.value.map(l => [l.name_zh, l.criterion_id]));

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) throw new Error('Excel文件为空或格式不正确！');

      progress.total = jsonData.length;
      progress.current = 0;
      progress.percentage = 0;
      progress.visible = true;

      for (const row of jsonData) {
        progress.current++;
        progress.currentAccount = row.sub_account_id || 'N/A';
        progress.statusText = '正在翻译中文术语并调用AI...';
        progress.percentage = Math.floor((progress.current / progress.total) * 100);

        // --- 执行翻译 ---
        const scriptLocations = (row.locations || '').split(',').map((name: string) => locationMap.get(name.trim())).filter(Boolean);
        const scriptLanguages = (row.languages || '').split(',').map((name: string) => languageMap.get(name.trim())).filter(Boolean);
        const scriptMatchType = matchTypeMap[row.keywordMatchType] || row.keywordMatchType || 'BROAD';

        // a. 准备AI请求的数据
        const aiPayload = {
          ad_link: row.adLink,
          keywords: (row.keywords || '').split(','),
          ai_prompt: row.ai_prompt,
          model: 'openai/gpt-4o',
          target_language: row.languages, // AI提示词仍然使用自然语言
          target_country: row.locations,
          example_headlines: (row.example_headlines || '').split(',').filter(Boolean),
          example_descriptions: (row.example_descriptions || '').split(',').filter(Boolean)
        };

        // b. 调用AI
        const aiRes = await generateAIContentAPI(aiPayload);
        if (aiRes.data.status !== 0) throw new Error(`账户 ${row.sub_account_id} AI文案生成失败: ${aiRes.data.message}`);
        const aiContent = aiRes.data.data;

        // c. 准备保存草稿的完整payload (使用翻译后的值)
        progress.statusText = 'AI生成成功，正在保存为草稿...';
        const draftPayload = {
          campaignName: row.campaignName,
          campaignStatus: row.campaignStatus,
          budget: row.budget,
          locations: scriptLocations,
          languages: scriptLanguages,
          keywords: (row.keywords || '').split(',').filter(Boolean),
          keywordMatchType: scriptMatchType,
          adLink: row.adLink,
          headlines: aiContent.headlines.map((h: any) => h.original),
          descriptions: aiContent.descriptions.map((d: any) => d.original),
          biddingStrategy: 'MANUAL_CPC',
          networks: ['Google Search'],
          adGroupName: 'Ad Group 1',
        };

        // d. 调用保存草稿接口
        await saveDraftAPI({
          subAccountId: row.sub_account_id,
          actionType: row.action_type || 'CREATE',
          payload: draftPayload,
        });
      }

      progress.visible = false;
      ElMessage.success(`全部 ${progress.total} 条记录处理完成，已保存为草稿！`);

    } catch (error: any) {
      progress.visible = false;
      ElMessage.error(`处理失败: ${error.message}`);
    } finally {
        if(uploadRef.value) {
            uploadRef.value.clearFiles();
        }
    }
  };
  reader.readAsArrayBuffer(file.raw);
}
// --- ▲▲▲ 函数结束 ▲▲▲ ---


const fetchAccounts = async (isSilent = false) => {
  if (!isSilent) {
    loading.value = true
  }
  try {
    const currentUser = userStore.userInfo
    if (!currentUser) {
      console.error('无法获取账户列表，因为用户信息不存在！')
      // 这里可以添加一个登出或错误提示逻辑
      loading.value = false
      return
    }
    // 将包含 userId 的对象作为参数传递
    const res = await getAccountsAPI({ userId: currentUser.id })
    if (res.data.status === 0) {
      allAccounts.value = res.data.data
    }
  } catch (error) {
    console.error('获取账户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// Vue生命周期钩子
onMounted(() => {
  // 1. 页面加载时，执行一次带加载动画的请求
  fetchAccounts(false);

  // 2. 启动 WebSocket 连接
  socket.connect();

  socket.on('connect', () => {
    console.log('成功连接到WebSocket服务器! ID:', socket.id);
  });

  // 3. 监听后端广播的所有更新事件
  const handleUpdate = (eventName: string, data: any) => {
    console.log(`收到 ${eventName} 消息:`, data);
    ElMessage.info('列表状态已更新，正在无感刷新...');
    fetchAccounts(true); // 以静默模式刷新列表
  };

  socket.on('jobs_updated', (data) => handleUpdate('jobs_updated', data));
  socket.on('accounts_updated', (data) => handleUpdate('accounts_updated', data));

  socket.on('connect_error', (err) => {
    console.error('WebSocket 连接失败:', err.message);
  });
});

onUnmounted(() => {
  if (socket) {
    console.log('正在断开WebSocket连接...');
    socket.off('jobs_updated'); // 移除监听，好习惯
    socket.off('accounts_updated');
    socket.disconnect();
  }
});


// ... 其他所有辅助函数 (options, getCampaignStatus, 等) 与您提供的代码完全一致 ...
const options = computed(() => {
  const managerSet = new Set<string>()
  const networkSet = new Set<string>()
  const affiliateAccountSet = new Set<string>()
  allAccounts.value.forEach((acc) => {
    if (acc.manager_name) managerSet.add(acc.manager_name)
    if (acc.affiliate_network) networkSet.add(acc.affiliate_network)
    if (acc.affiliate_account) affiliateAccountSet.add(acc.affiliate_account)
  })
  return {
    managers: Array.from(managerSet),
    networks: Array.from(networkSet),
    affiliateAccounts: Array.from(affiliateAccountSet),
  }
})
const getCampaignStatus = (campaignsData: Campaign[] | null) => {
  const campaigns = Array.isArray(campaignsData) ? campaignsData : []
  if (campaigns.length > 0) {
    return { text: '已占用', type: 'warning' }
  }
  return { text: '空账户', type: 'success' }
}
const getJobStatus = (status: string | null) => {
  if (!status) return { text: '', type: 'info' };
  switch (status) {
    case 'DRAFT':
      return { text: '草稿', type: 'info' };
    case 'PENDING_UPDATE':
      return { text: '待处理', type: 'warning' };
    case 'PROCESSING':
      return { text: '提交中', type: 'primary' };
    case 'SUCCESS':
      return { text: '成功', type: 'success' };
    case 'FAILED':
      return { text: '失败', type: 'danger' };
    default:
      return { text: '', type: 'info' };
  }
}
const getAdvertiserName = (account: Account): string => {
  const isOccupied = account.campaigns_data && account.campaigns_data.length > 0;
  const hasActiveJob = account.job_status === 'DRAFT' || account.job_status === 'PROCESSING' || account.job_status === 'PENDING_UPDATE';
  if (isOccupied && !hasActiveJob) {
    return account.advertiser_name || '--';
  }
  if (!isOccupied && hasActiveJob) {
    try {
      if (account.job_payload) {
        let payloadObj: any = account.job_payload;
        if (typeof account.job_payload === 'string') {
          payloadObj = JSON.parse(account.job_payload);
        }
        const campaignName = payloadObj.campaignName || '';
        const match = campaignName.match(/】(.*?)(_|$)/);
        if (match && match[1]) {
          return match[1];
        }
        return campaignName;
      }
    } catch (e) {
      console.error("解析payload失败:", e);
      return '解析错误';
    }
  }
  return account.advertiser_name || '--';
}
const formatBudget = (account: Account) => {
  const campaigns = Array.isArray(account.campaigns_data) ? account.campaigns_data : []
  if (campaigns.length === 0) return '--'
  const totalBudget = campaigns.reduce((sum, campaign) => sum + (campaign.budget || 0), 0)
  const currencySymbols: { [key: string]: string } = { USD: '$', CNY: '¥', HKD: 'HK$' }
  const symbol = account.currency_code ? currencySymbols[account.currency_code] : ''
  return `${symbol}${totalBudget.toFixed(2)}`
}

// ▼▼▼ 替换这个函数 ▼▼▼
const getLocations = (campaignsData: Campaign[] | null): string => {
  const campaigns = Array.isArray(campaignsData) ? campaignsData : [];

  // 如果线上没有广告系列数据，也视为所有国家
  if (campaigns.length === 0) {
    return '--';
  }

  const locationSet = new Set<string>();
  campaigns.forEach((campaign) => {
    // 确保 campaign.locations 是一个数组
    if (Array.isArray(campaign.locations)) {
      campaign.locations.forEach((loc: string) => locationSet.add(loc));
    }
  });

  // 如果遍历后发现地点集合是空的，说明没有设置具体地区，应显示“所有国家”
  if (locationSet.size === 0) {
    return '所有国家';
  }

  // 如果有具体地区，则拼接并显示
  return Array.from(locationSet).join(', ');
}
// ▲▲▲ 替换结束 ▲▲▲

const formatTime = (time: string | null) => {
  if (!time) return '--'
  return new Date(time).toLocaleString()
}
const filteredAccounts = computed(() => {
  let result = allAccounts.value
  if (filters.selectedManagers.length > 0) {
    result = result.filter((acc) => filters.selectedManagers.includes(acc.manager_name))
  }
  if (filters.selectedAffiliateAccounts.length > 0) {
    result = result.filter(
      (acc) =>
        acc.affiliate_account && filters.selectedAffiliateAccounts.includes(acc.affiliate_account)
    )
  }
  if (filters.selectedNetworks.length > 0) {
    result = result.filter(
      (acc) => acc.affiliate_network && filters.selectedNetworks.includes(acc.affiliate_network)
    )
  }
  if (filters.campaignStatus !== 'all') {
    result = result.filter((acc) => {
      const campaigns = Array.isArray(acc.campaigns_data) ? acc.campaigns_data : []
      if (filters.campaignStatus === 'empty') return campaigns.length === 0
      if (filters.campaignStatus === 'occupied') return campaigns.length > 0
      return true
    })
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    result = result.filter(
      (acc) =>
        acc.sub_account_name.toLowerCase().includes(term) || acc.sub_account_id.includes(term)
    )
  }
  return result
})
const drawer = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  selectedAccount: null as any | null,
})
const openDrawer = (mode: 'create' | 'edit', account: any) => {
  drawer.mode = mode
  drawer.selectedAccount = account
  drawer.visible = true
}
const closeDrawer = () => {
  drawer.visible = false
}
const onDrawerSuccess = () => {
  closeDrawer()
  // 成功后无需手动刷新，WebSocket会自动通知
}
const handleCreate = (account: any) => {
  openDrawer('create', account)
}
const handleEdit = (account: any) => {
  openDrawer('edit', account)
}
// ▼▼▼ 核心修改：实现 handleDelete 函数 ▼▼▼
const handleDelete = async (account: Account) => {
  // 只能删除我们系统创建的任务
  if (!account.job_id) {
    ElMessage.warning('此账户没有可管理的指令记录。');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除与账户 "${account.sub_account_name}" 关联的广告系列草稿或线上广告吗？此操作将提交一个删除指令，由Ads脚本执行。`,
      '危险操作确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    )

    // 调用新的API来请求删除
    const res = await requestDeleteJobAPI(account.job_id);
    if (res.data.status === 0) {
      ElMessage.success(res.data.message || '删除请求提交成功！');
      // 成功后无需手动刷新，WebSocket会自动更新列表
    } else {
      ElMessage.error(res.data.message || '删除请求提交失败');
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交删除请求时发生错误:', error);
    } else {
      ElMessage.info('操作已取消');
    }
  }
}
// ▲▲▲ 修改结束 ▲▲▲
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 新增样式，让上传按钮和其他按钮对齐 */
.upload-button {
  display: inline-flex;
  margin-right: 12px;
}
.progress-content p {
  margin: 8px 0;
}
.status-text {
  color: #909399;
  font-style: italic;
}
.filter-container {
  padding: 18px 20px 0;
  background-color: #fcfcfc;
  border-radius: 4px;
  margin-bottom: 20px;
  border: 1px solid #f0f0f0;
}
.filter-form .el-form-item {
  margin-bottom: 18px;
  width: 100%;
}
.el-select {
  width: 100%;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px; /* 在按钮之间增加一些间距 */
}
.header-actions button {
  margin-left: 0px !important; /* 确保按钮之间有间距 */
}
</style>
