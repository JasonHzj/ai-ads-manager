<template>
  <el-drawer
    :model-value="visible"
    title="AI 助手"
    direction="rtl"
    size="40%"
    :append-to-body="true"
    @close="$emit('close')"
  >
    <el-form :model="form" label-position="top" style="padding: 20px" v-loading="loading">
      <el-form-item label="AI模型">
        <el-select v-model="form.model" placeholder="选择AI模型" style="width: 100%">
          <el-option label="GPT-4o (推荐)" value="openai/gpt-4o" />
          <el-option label="GPT-4 Turbo" value="openai/gpt-4-turbo" />
          <el-option label="GPT-5" value="openai/gpt-5" />
          <el-option label="Gemini 2.5 Pro" value="google/gemini-2.5-pro" />
          <el-option label="Gemini 1.5 Pro" value="google/gemini-1.5-pro-latest" />
          <el-option label="Claude Opus 4" value="anthropic/claude-opus-4" />
          <el-option label="Claude Sonnet 4" value="anthropic/claude-sonnet-4" />
          <el-option label="DeepSeek: R1" value="deepseek/deepseek-r1" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标国家 (默认联动，可修改)">
        <el-select v-model="form.target_country" placeholder="选择目标国家" style="width: 100%" filterable>
          <el-option
            v-for="item in countryOptions"
            :key="item.criterion_id"
            :label="`${item.name_zh} (${item.name})`"
            :value="item.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标语言 (默认联动，可修改)">
        <el-select v-model="form.target_language" placeholder="选择生成语言" style="width: 100%" filterable>
          <el-option
            v-for="item in languageOptions"
            :key="item.criterion_id"
            :label="`${item.name_zh} (${item.name})`"
            :value="item.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="AI提示词">
        <el-input
          v-model="form.ai_prompt"
          type="textarea"
          :rows="6"
          placeholder="请输入核心产品、卖点、目标用户等信息，帮助AI更好地创作。"
        />
      </el-form-item>
      <el-divider content-position="left">AI参考文案 (选填)</el-divider>
      <el-form-item label="参考标题 (每行一个)">
        <el-input
          v-model="form.example_headlines"
          type="textarea"
          :rows="4"
          placeholder="提供一些您喜欢的标题风格或文案"
        />
      </el-form-item>
      <el-form-item label="参考描述 (每行一个)">
        <el-input
          v-model="form.example_descriptions"
          type="textarea"
          :rows="4"
          placeholder="提供一些您喜欢的描述风格或文案"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="loading">开始生成</el-button>
        <el-button @click="$emit('close')">取消</el-button>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { generateAIContentAPI } from '@/api'
import { ElMessage } from 'element-plus'
import { useAdOptions } from '@/composables/useAdOptions'

const props = defineProps({
  visible: Boolean,
  baseInfo: {
    type: Object,
    default: () => ({
      adLink: '',
      keywords: '',
      locations: [],
      languages: [],
    }),
  },
})

const emit = defineEmits(['close', 'generation-complete'])

const { countries: countryOptions, languages: languageOptions } = useAdOptions()
const loading = ref(false)

const form = reactive({
  model: 'openai/gpt-4o',
  target_language: '',
  target_country: '',
  ai_prompt: '',
  example_headlines: '',
  example_descriptions: '',
})

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    if (props.baseInfo.locations.length > 0 && countryOptions.value.length > 0) {
      const firstLocationId = props.baseInfo.locations[0];
      const country = countryOptions.value.find(c => c.criterion_id === firstLocationId);
      form.target_country = country ? country.name : '';
    }
    if (props.baseInfo.languages.length > 0 && languageOptions.value.length > 0) {
      const firstLanguageId = props.baseInfo.languages[0];
      const lang = languageOptions.value.find(l => l.criterion_id === firstLanguageId);
      form.target_language = lang ? lang.name : '';
    }
  }
})

const handleGenerate = async () => {
  if (!form.ai_prompt) {
    ElMessage.warning('请输入AI提示词！')
    return
  }
  loading.value = true
  try {
    const payload = {
      ad_link: props.baseInfo.adLink,
      keywords: props.baseInfo.keywords,
      model: form.model,
      target_language: form.target_language,
      target_country: form.target_country,
      ai_prompt: form.ai_prompt,
      example_headlines: form.example_headlines.split('\n').filter(Boolean),
      example_descriptions: form.example_descriptions.split('\n').filter(Boolean),
    }

    const response = await generateAIContentAPI(payload)
    const resData = response.data

    if (resData && resData.status === 0) {
      // =======================================================================
      // 核心改动：发出信号时，同时传递结果和生成该结果的请求参数
      // =======================================================================
      emit('generation-complete', { results: resData.data, payload: payload })
    } else {
      ElMessage.error(resData.message || 'AI生成失败')
    }
  } catch (error) {
    console.error('AI生成时发生错误:', error)
  } finally {
    loading.value = false
  }
}
</script>
