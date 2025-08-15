<template>
  <div>
    <el-drawer
      :model-value="visible"
      :with-header="false"
      direction="rtl"
      size="50%"
      @close="$emit('close')"
      :class="{ 'pushed-left': isAiHelperVisible }"
      class="main-drawer"
    >
      <div class="drawer-container">
        <div class="drawer-header">
          <h3>{{ isEditMode ? '修改广告系列' : '新增广告系列' }}</h3>
          <p>子账户: {{ account?.sub_account_name }} ({{ account?.sub_account_id }})</p>
        </div>
        <div class="drawer-body">
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" v-loading="isLoading">
            <el-form-item label="广告系列名" prop="campaignName">
              <el-input v-model="form.campaignName" placeholder="请输入广告系列名称" />
            </el-form-item>
            <el-row :gutter="20">
              <el-col :span="12">
            <el-form-item label="广告系列状态">
              <el-switch
                v-model="form.campaignStatus"
                inline-prompt
                size="large"
                style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                active-text="启用"
                inactive-text="暂停"
                active-value="ENABLED"
                inactive-value="PAUSED"
              />
            </el-form-item>
            </el-col>
             <el-col :span="12">
            <el-form-item label="每日预算" prop="budget">
              <el-input-number v-model="form.budget" :precision="2" :step="1" :min="defaultBudget" />
              <span style="margin-left: 10px; color: #909399">{{ account?.currency_code }}</span>
            </el-form-item>
            </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="投放国家" prop="locations">
                  <el-select v-model="form.locations" multiple filterable placeholder="可多选或搜索" style="width: 100%" @change="handleCountryChange">
                    <el-option v-for="item in countries" :key="item.criterion_id" :label="`${item.name_zh} (${item.name})`" :value="item.criterion_id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="广告语言" prop="languages">
                  <el-select v-model="form.languages" multiple filterable placeholder="可多选或搜索" style="width: 100%" :loading="loading.languages">
                    <el-option v-for="item in localLanguages" :key="item.criterion_id" :label="`${item.name_zh} (${item.name})`" :value="item.criterion_id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="关键字" prop="keywords">
              <el-input v-model="form.keywords" type="textarea" placeholder="每个关键字一行" />
            </el-form-item>
            <el-form-item label="关键字匹配" prop="keywordMatchType">
              <el-select v-model="form.keywordMatchType">
                <el-option label="完全匹配" value="EXACT" />
                <el-option label="词组匹配" value="PHRASE" />
                <el-option label="广泛匹配" value="BROAD" />
              </el-select>
            </el-form-item>
            <el-form-item label="广告链接" prop="adLink">
              <el-input v-model="form.adLink" placeholder="https://example.com" />
            </el-form-item>
            <el-divider content-position="left">AI生成内容填充区</el-divider>
            <el-form-item label="广告标题 (每行一个)">
              <el-input v-model="form.headlines" type="textarea" :rows="8" placeholder="由AI生成，每行一个标题" />
            </el-form-item>
            <el-form-item label="广告描述 (每行一个)">
              <el-input v-model="form.descriptions" type="textarea" :rows="5" placeholder="由AI生成，每行一个描述" />
            </el-form-item>
          </el-form>
        </div>
        <div class="drawer-footer">
          <el-button @click="$emit('close')">取 消</el-button>
          <el-button type="success" @click="openAiHelper">AI 生成广告</el-button>
          <el-button type="primary" @click="handleSaveDraft" :loading="loading.submit">
             {{ isEditMode ? '保存修改' : '保存草稿' }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <AiHelperDrawer
      :visible="isAiHelperVisible"
      :base-info="{
        adLink: form.adLink,
        keywords: form.keywords,
        locations: form.locations,
        languages: form.languages
      }"
      @close="isAiHelperVisible = false"
      @generation-complete="handleAiGenerationComplete"
    />

    <AiResultModal
      :visible="isAiModalVisible"
      :results="aiGeneratedContent"
      @close="isAiModalVisible = false"
      @confirm="applyAiContent"
      @regenerate="handleRegenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, defineProps, defineEmits } from 'vue'
import type { PropType } from 'vue'
import { saveDraftAPI, getLanguagesForCountryAPI } from '@/api'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import AiHelperDrawer from './AiHelperDrawer.vue'
import AiResultModal from './AiResultModal.vue'
import type { AiResults } from '@/types'
import { useAdOptions } from '@/composables/useAdOptions'

// --- Props, Emits 定义 ---
interface Account {
  job_id?: number | null;
  sub_account_id: string;
  sub_account_name: string;
  currency_code: string;
  campaigns_data: any[] | null;
  job_payload?: any | null;
}
const props = defineProps({
  visible: Boolean,
  account: { type: Object as PropType<Account | null>, required: true },
  mode: String,
})
const emit = defineEmits(['close', 'success'])

const { countries, languages: allLanguages, isLoading } = useAdOptions()

// --- 状态定义 ---
const form = ref<any>({})
const loading = reactive({
  languages: false,
  submit: false,
})
const localLanguages = ref<any[]>([])
const defaultBudget = ref(1)
const isEditMode = computed(() => props.mode === 'edit')
const originalCampaignId = ref<string | null>(null);
const originalAdGroupId = ref<string | null>(null);

const formRef = ref<FormInstance | null>(null);
const rules = reactive<FormRules>({
  campaignName: [{ required: true, message: '请输入广告系列名称', trigger: 'blur' }],
  budget: [{ required: true, message: '请输入每日预算', trigger: 'blur' }],
  locations: [{ required: true, message: '请选择投放国家', trigger: 'change' }],
  languages: [{ required: true, message: '请选择广告语言', trigger: 'change' }],
  keywords: [{ required: true, message: '请输入关键字', trigger: 'blur' }],
  keywordMatchType: [{ required: true, message: '请选择关键字匹配类型', trigger: 'change' }],
  adLink: [{ required: true, message: '请输入广告链接', trigger: 'blur' }],
});

// --- 辅助函数：获取一个全新的、干净的表单对象 ---
const getEmptyForm = () => {
  const budgetMap: { [key: string]: number } = { CNY: 7, USD: 1, HKD: 8 }
  defaultBudget.value = props.account?.currency_code ? budgetMap[props.account.currency_code] : 1;

  return {
      campaignName: '', campaignStatus: 'ENABLED', budget: defaultBudget.value,
      locations: ['all'], languages: [1000], keywords: '',
      keywordMatchType: 'EXACT', adLink: '', headlines: '', descriptions: '',
  };
}

// --- 核心修改：在 initializeForm 函数中统一数据格式 ---
const initializeForm = (account: Account) => {
  const emptyForm = getEmptyForm();

  if (isEditMode.value) {
    let sourceData: any = {};
    if (account.job_payload) {
      sourceData = typeof account.job_payload === 'string' ? JSON.parse(account.job_payload) : account.job_payload;
      originalCampaignId.value = sourceData.campaignId || null;
      originalAdGroupId.value = sourceData.adGroupId || null;
    }
    else if (account.campaigns_data && account.campaigns_data.length > 0) {
      const campaign = account.campaigns_data[0];
      originalCampaignId.value = campaign.id;
      originalAdGroupId.value = campaign.adGroups[0]?.id;
      sourceData = {
        campaignName: campaign.name,
        campaignStatus: campaign.status || 'ENABLED',
        budget: campaign.budget,
        locations: campaign.locations?.length > 0 ? campaign.locations : [],
        languages: campaign.languages,
        keywords: campaign.adGroups[0]?.keywords,
        keywordMatchType: campaign.adGroups[0]?.keywords[0]?.matchType || 'EXACT',
        adLink: campaign.adGroups[0]?.ads[0]?.finalUrls[0] || '',
        headlines: campaign.adGroups[0]?.ads[0]?.headlines,
        descriptions: campaign.adGroups[0]?.ads[0]?.descriptions,
      };
    }

    const combinedData = { ...emptyForm, ...sourceData };

    // **核心修正：无论数据源是什么，都将数组格式统一转换为字符串格式**
    if (Array.isArray(combinedData.keywords)) {
      // 修正：为 kw 添加明确类型
      combinedData.keywords = combinedData.keywords.map((kw: { text: string }) => (kw && kw.text) ? kw.text : kw).join('\n');
    }
    if (Array.isArray(combinedData.headlines)) {
       // 修正：为 h 添加明确类型
      combinedData.headlines = combinedData.headlines.map((h: any) => (h && h.text && h.text.text) ? h.text.text : (h.text || h)).join('\n');
    }
    if (Array.isArray(combinedData.descriptions)) {
       // 修正：为 d 添加明确类型
      combinedData.descriptions = combinedData.descriptions.map((d: any) => (d && d.text && d.text.text) ? d.text.text : (d.text || d)).join('\n');
    }

    form.value = combinedData;

  } else {
    form.value = getEmptyForm();
  }
}

// --- 语言联动逻辑 ---
const updateAvailableLanguages = async (selectedCountryIds: (string|number)[]) => {
  if (Array.isArray(selectedCountryIds) && selectedCountryIds.length > 1) {
    localLanguages.value = [...allLanguages.value];
    return;
  }
  if (!selectedCountryIds || selectedCountryIds.length === 0 || selectedCountryIds.includes('all')) {
    const english = allLanguages.value.find(lang => lang.criterion_id === 1000);
    localLanguages.value = english ? [english] : [];
    return;
  }
  loading.languages = true;
  try {
    const res = await getLanguagesForCountryAPI(selectedCountryIds[0]);
    localLanguages.value = res.data.data;
  } catch (error) { console.error('获取语言列表失败:', error); }
  finally { loading.languages = false; }
};

const handleCountryChange = async (selectedCountryIds: (string|number)[]) => {
  await updateAvailableLanguages(selectedCountryIds);
  if (selectedCountryIds.includes('all')) {
    form.value.languages = [1000];
  } else {
    form.value.languages = [];
  }
};

watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    const account = props.account;
    if (!account) return;
    initializeForm(account);
    await updateAvailableLanguages(form.value.locations);
  }
});

// --- AI 联动逻辑 (保持不变) ---
const isAiHelperVisible = ref(false)
const isAiModalVisible = ref(false)
const aiGeneratedContent = ref<AiResults>({ headlines: [], descriptions: [] })
const openAiHelper = () => { isAiHelperVisible.value = true }
const handleAiGenerationComplete = (results: AiResults) => {
  aiGeneratedContent.value = results
  isAiHelperVisible.value = false
  isAiModalVisible.value = true
}
const applyAiContent = (finalContent: { headlines: string[], descriptions: string[] }) => {
  form.value.headlines = finalContent.headlines.join('\n')
  form.value.descriptions = finalContent.descriptions.join('\n')
  isAiModalVisible.value = false
  ElMessage.success('文案已成功应用！')
}
const handleRegenerate = () => {
  isAiHelperVisible.value = false
  isAiHelperVisible.value = true
}

// --- 核心修改：使用 Promise 方式重写保存逻辑 ---
const handleSaveDraft = async () => {
  if (!formRef.value) return;

  try {
    // 1. 等待表单验证完成，如果失败，它会直接抛出错误并进入catch块
    await formRef.value.validate();

    // --- 如果代码能执行到这里，说明验证已通过 ---
    loading.submit = true;
    try {
      const payload: any = {
        campaignName: form.value.campaignName,
        campaignStatus: form.value.campaignStatus,
        budget: form.value.budget,
        locations: form.value.locations.includes('all') ? [] : form.value.locations,
        languages: form.value.languages,
        keywords: form.value.keywords.split('\n').filter((k: string) => k.trim() !== ''),
        keywordMatchType: form.value.keywordMatchType,
        adLink: form.value.adLink,
        headlines: form.value.headlines.split('\n').filter((h: string) => h.trim() !== ''),
        descriptions: form.value.descriptions.split('\n').filter((d: string) => d.trim() !== ''),
        biddingStrategy: 'MANUAL_CPC',
        networks: ['Google Search'],
        adGroupName: 'Ad Group 1',
      };
      if (isEditMode.value) {
        payload.campaignId = originalCampaignId.value;
        payload.adGroupId = originalAdGroupId.value;
      }
      const draftData = {
        jobId: props.account?.job_id,
        subAccountId: props.account?.sub_account_id,
        actionType: isEditMode.value ? 'UPDATE' : 'CREATE',
        payload: payload,
      };
      await saveDraftAPI(draftData);
      ElMessage.success('草稿保存成功！');
      emit('success');
    } catch (error) {
      console.error('保存草稿失败:', error);
    } finally {
      loading.submit = false;
    }

  } catch (validationErrors) {
    // 2. 如果验证失败，在这里提示用户
    ElMessage.error('表单信息不完整，请检查！');
    console.log('表单验证失败:', validationErrors)
  }
}
</script>

<style scoped>
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.drawer-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}
.drawer-header h3 {
  margin: 0;
  font-size: 18px;
}
.drawer-header p {
  margin: 5px 0 0;
  color: #909399;
}
.drawer-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
}
.drawer-footer {
  padding: 10px 20px;
  border-top: 1px solid #eee;
  text-align: right;
}
.main-drawer {
  transition: transform 0.3s ease !important;
}
.main-drawer.pushed-left {
  transform: translateX(-40vw);
}
</style>
