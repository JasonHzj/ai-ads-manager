<template>
  <el-dialog
    :model-value="visible"
    title="AI 生成结果确认与编辑"
    width="70%"
    top="5vh"
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <div class="edit-area">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="广告标题" name="headlines">
          <div class="edit-header">
            <div class="column-header">投放语言 (原文)</div>
            <div class="column-header">中文翻译 (供参考)</div>
          </div>
          <div class="edit-content">
            <div v-for="(item, index) in editableContent.headlines" :key="index" class="edit-row">
              <el-input v-model="item.original" />
              <el-input v-model="item.translation_zh" />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="广告描述" name="descriptions">
           <div class="edit-header">
            <div class="column-header">投放语言 (原文)</div>
            <div class="column-header">中文翻译 (供参考)</div>
          </div>
          <div class="edit-content">
            <div v-for="(item, index) in editableContent.descriptions" :key="index" class="edit-row">
              <el-input v-model="item.original" type="textarea" :autosize="{ minRows: 2 }" />
              <el-input v-model="item.translation_zh" type="textarea" :autosize="{ minRows: 2 }" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('regenerate')">重新生成</el-button>
        <div>
          <el-button @click="$emit('close')">取 消</el-button>
          <el-button type="primary" @click="handleConfirm"> 应用并关闭 </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, defineProps, defineEmits } from 'vue'
import type { PropType } from 'vue'

// 定义AI返回结果中单个条目的类型
interface AiResultItem {
  original: string
  translation_zh: string
}

// 定义完整的AI结果类型
interface AiResults {
  headlines: AiResultItem[]
  descriptions: AiResultItem[]
}

const props = defineProps({
  visible: Boolean,
  results: {
    type: Object as PropType<AiResults>,
    required: true,
  },
})

const emit = defineEmits(['close', 'confirm', 'regenerate'])

const activeTab = ref('headlines')
// 让本地可编辑内容的类型与传入的类型完全匹配
const editableContent = reactive<{
  headlines: AiResultItem[]
  descriptions: AiResultItem[]
}>({
  headlines: [],
  descriptions: [],
})

// 监听传入的AI结果，并深拷贝一份用于编辑，防止直接修改props
watch(
  () => props.results,
  (newResults) => {
    if (newResults) {
      // 直接使用JSON进行深拷贝，确保数据结构正确且可编辑
      editableContent.headlines = JSON.parse(JSON.stringify(newResults.headlines || []))
      editableContent.descriptions = JSON.parse(JSON.stringify(newResults.descriptions || []))
    }
  },
  { deep: true, immediate: true }
)

// 当用户点击“应用”时，只提取第一列（原文）的内容
const handleConfirm = () => {
  const finalResults = {
    headlines: editableContent.headlines.map((item) => item.original),
    descriptions: editableContent.descriptions.map((item) => item.original),
  }
  emit('confirm', finalResults)
}
</script>

<style scoped>
.edit-area {
  max-height: 75vh;
  overflow-y: auto;
}
.edit-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 10px;
  margin-bottom: 8px;
}
.column-header {
  font-weight: bold;
  color: #303133;
}
.edit-content {
  padding-right: 15px;
}
.edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 10px;
  align-items: center;
}
.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
