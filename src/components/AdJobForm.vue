<template>
  <el-form :model="form" label-width="120px" v-loading="loading.form">
    <el-divider content-position="left">账户筛选与选择</el-divider>
    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="经理账户 (MCC)">
          <el-select
            v-model="filters.selectedManager"
            placeholder="请先选择经理账户"
            style="width: 100%"
            clearable
            @change="form.account_id = ''"
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
      <el-col :span="8">
        <el-form-item label="占用状态">
          <el-select
            v-model="filters.campaignStatus"
            placeholder="默认不做筛选"
            style="width: 100%"
            @change="form.account_id = ''"
          >
            <el-option label="不做筛选" value="all" />
            <el-option label="空账户" value="empty" />
            <el-option label="已占用" value="occupied" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="子账户ID">
          <el-select
            v-model="form.account_id"
            placeholder="请选择投放账户"
            filterable
            style="width: 100%"
            @change="handleSubAccountChange"
          >
            <el-option
              v-for="item in filteredSubAccounts"
              :key="item.id"
              :label="item.sub_account_name"
              :value="item.sub_account_id"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">广告内容</el-divider>

    <el-form-item label="广告链接">
      <el-input v-model="form.ad_link" placeholder="https://example.com" />
    </el-form-item>
    <el-form-item label="关键字">
      <el-input v-model="form.keywords" type="textarea" placeholder="多个关键字请用英文逗号分隔" />
    </el-form-item>

    <el-divider content-position="left">AI 创意助手</el-divider>

    <el-form-item label="AI提示词">
      <el-input v-model="form.ai_prompt" type="textarea" placeholder="请输入核心想法、产品优势等" />
    </el-form-item>
    <el-form-item>
      <el-button
        type="success"
        @click="handleGenerateAI"
        :loading="loading.ai"
        icon="el-icon-magic-stick"
        >AI 生成文案</el-button
      >
    </el-form-item>

    <el-form-item label="广告标题">
      <el-input
        v-model="form.generated_headlines"
        type="textarea"
        :rows="5"
        placeholder="由AI生成，格式为JSON，可手动修改"
      />
    </el-form-item>
    <el-form-item label="广告描述">
      <el-input
        v-model="form.generated_descriptions"
        type="textarea"
        :rows="5"
        placeholder="由AI生成，格式为JSON，可手动修改"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit" :loading="loading.submit">立即创建</el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script lang="ts">
// **核心修正：添加一个标准的 <script> 块来提供一个明确的导出**
// 这可以帮助一些旧的编辑器工具（如Vetur）正确识别这个文件是一个Vue组件。
export default {
  name: 'AdJobForm',
}
</script>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { getAccountsAPI, createJobAPI, generateAIContentAPI } from '@/api' // 导入需要的API
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits(['success', 'cancel'])

// 表单最终提交的数据
const form = ref({
  account_id: '',
  ad_link: '',
  keywords: '',
  ai_prompt: '',
  generated_headlines: '',
  generated_descriptions: '' /* ...其他字段 */,
})
// 存储从后端获取的原始账户列表
const allAccounts = ref<any[]>([])
// 筛选条件
const filters = reactive({ selectedManager: '', campaignStatus: 'all' })
// 加载状态
const loading = reactive({ form: true, ai: false, submit: false })

// **核心计算属性**

// 1. 动态计算出所有唯一的经理账户名称
const options = computed(() => {
  const managerSet = new Set(allAccounts.value.map((acc) => acc.manager_name))
  return {
    managers: Array.from(managerSet),
  }
})

// 2. 根据筛选条件，动态计算出最终的子账户列表
const filteredSubAccounts = computed(() => {
  return allAccounts.value.filter((acc) => {
    // 筛选条件1: 经理账户
    const managerMatch = !filters.selectedManager || acc.manager_name === filters.selectedManager

    // **核心修正：筛选条件2: 占用状态**
    let campaignMatch = true
    // **核心修正：直接使用 acc.campaigns_data，不再需要 JSON.parse**
    const campaigns = Array.isArray(acc.campaigns_data) ? acc.campaigns_data : []
    if (filters.campaignStatus === 'empty') {
      campaignMatch = campaigns.length === 0
    } else if (filters.campaignStatus === 'occupied') {
      campaignMatch = campaigns.length > 0
    }

    return managerMatch && campaignMatch
  })
})

// 获取初始账户数据
const fetchInitialOptions = async () => {
  try {
    const res = await getAccountsAPI()
    if (res.data.status === 0) {
      allAccounts.value = res.data.data
    } else {
      ElMessage.error('获取账户列表失败: ' + res.data.message)
    }
  } catch (error) {
    console.error('获取账户列表时发生网络错误:', error)
    // 全局拦截器会显示错误，这里只做日志记录
  } finally {
    loading.form = false
  }
}

// **新增：处理子账户选择事件，触发警告**
const handleSubAccountChange = (selectedSubAccountId: string) => {
  const selectedAccount = allAccounts.value.find(
    (acc) => acc.sub_account_id === selectedSubAccountId
  )

  if (selectedAccount) {
    // **核心修正：直接使用 selectedAccount.campaigns_data**
    const campaigns = selectedAccount.campaigns_data
    if (Array.isArray(campaigns) && campaigns.length > 0) {
      ElMessageBox.confirm('警告，此子账号已有广告系列，是否新增？', '请确认', {
        confirmButtonText: '继续新增',
        cancelButtonText: '取消选择',
        type: 'warning',
      }).catch(() => {
        // 如果用户点击“取消”或关闭弹窗，则清空选择
        form.value.account_id = ''
      })
    }
  }
}

// 调用AI生成内容
const handleGenerateAI = async () => {
  loading.ai = true
  try {
    const res = await generateAIContentAPI({
      ad_link: form.value.ad_link,
      keywords: form.value.keywords,
      ai_prompt: form.value.ai_prompt,
    })
    const { headlines, descriptions } = res.data.data
    form.value.generated_headlines = JSON.stringify(headlines, null, 2)
    form.value.generated_descriptions = JSON.stringify(descriptions, null, 2)
    ElMessage.success('AI文案生成成功！')
  } finally {
    loading.ai = false
  }
}

// 提交表单
const handleSubmit = async () => {
  loading.submit = true
  try {
    await createJobAPI(form.value)
    ElMessage.success('广告任务创建成功！')
    emit('success')
  } finally {
    loading.submit = false
  }
}

onMounted(fetchInitialOptions)
</script>
