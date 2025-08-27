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
            <template v-for="(item, index) in editableContent.headlines" :key="`h-${index}`">
              <div class="edit-row" v-if="item">
                <div class="input-with-meta">
                  <el-input v-model="item.original" @input="validateHeadline(index)" />
                  <div class="meta-info">
                    <span :class="{ 'char-count-error': headlineErrors[index] }">
                      {{ item.original?.length || 0 }} / 30
                    </span>
                    <el-tooltip v-if="headlineErrors[index]" :content="headlineErrors[index]" placement="top">
                       <el-icon class="error-icon"><Warning /></el-icon>
                    </el-tooltip>
                  </div>
                </div>
                <el-input v-model="item.translation_zh" />
                <div class="action-buttons">
                   <el-button @click="regenerateItem('headline', index)" type="primary" link>
                      <el-icon><Refresh /></el-icon>
                      重写
                   </el-button>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>

        <el-tab-pane label="广告描述" name="descriptions">
           <div class="edit-header">
            <div class="column-header">投放语言 (原文)</div>
            <div class="column-header">中文翻译 (供参考)</div>
          </div>
          <div class="edit-content">
            <template v-for="(item, index) in editableContent.descriptions" :key="`d-${index}`">
              <div class="edit-row" v-if="item">
                <div class="input-with-meta">
                  <el-input v-model="item.original" type="textarea" :autosize="{ minRows: 2 }" @input="validateDescription(index)"/>
                   <div class="meta-info">
                    <span :class="{ 'char-count-error': descriptionErrors[index] }">
                      {{ item.original?.length || 0 }} / 90
                    </span>
                     <el-tooltip v-if="descriptionErrors[index]" :content="descriptionErrors[index]" placement="top">
                       <el-icon class="error-icon"><Warning /></el-icon>
                    </el-tooltip>
                  </div>
                </div>
                <el-input v-model="item.translation_zh" type="textarea" :autosize="{ minRows: 2 }" />
                <div class="action-buttons">
                   <el-button @click="regenerateItem('description', index)" type="primary" link>
                      <el-icon><Refresh /></el-icon>
                      重写
                   </el-button>
                </div>
              </div>
            </template>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('regenerate')">全部重新生成</el-button>
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
import { Refresh, Warning } from '@element-plus/icons-vue'
import type { AiResults, AiResultItem } from '@/types' // 从全局类型定义引入

const props = defineProps({
  visible: Boolean,
  results: {
    type: Object as PropType<AiResults>,
    required: true,
  },
})

const emit = defineEmits(['close', 'confirm', 'regenerate', 'regenerate-item'])

const activeTab = ref('headlines')
const editableContent = reactive<AiResults>({
  headlines: [],
  descriptions: [],
})

const headlineErrors = reactive<Record<number, string>>({})
const descriptionErrors = reactive<Record<number, string>>({})

const headlineInvalidCharsRegex = /[^\p{L}\p{N}\s]/u
const descriptionInvalidCharsRegex = /[^\p{L}\p{N}\s,?!;.]/u

const validateHeadline = (index: number) => {
  const item = editableContent.headlines[index]
  if (!item || typeof item.original !== 'string') {
    delete headlineErrors[index]
    return
  }

  headlineInvalidCharsRegex.lastIndex = 0

  if (item.original.length > 30) {
    headlineErrors[index] = '字符数超出30个的限制'
  } else if (headlineInvalidCharsRegex.test(item.original)) {
    headlineErrors[index] = '包含不允许的符号'
  } else {
    delete headlineErrors[index]
  }
}

const validateDescription = (index: number) => {
  const item = editableContent.descriptions[index]
  if (!item || typeof item.original !== 'string') {
    delete descriptionErrors[index]
    return
  }

  descriptionInvalidCharsRegex.lastIndex = 0

  if (item.original.length > 90) {
    descriptionErrors[index] = '字符数超出90个的限制'
  } else if (descriptionInvalidCharsRegex.test(item.original)) {
    descriptionErrors[index] = '包含不允许的符号 (仅允许 , ? ! ; .)'
  } else {
    delete descriptionErrors[index]
  }
}

watch(
  () => props.results,
  (newResults) => {
    if (newResults) {
      // 过滤掉传入的脏数据，确保 editableContent 内部始终是有效的对象
      editableContent.headlines = JSON.parse(JSON.stringify(newResults.headlines || [])).filter(Boolean)
      editableContent.descriptions = JSON.parse(JSON.stringify(newResults.descriptions || [])).filter(Boolean)

      editableContent.headlines.forEach((_, index) => validateHeadline(index))
      editableContent.descriptions.forEach((_, index) => validateDescription(index))
    }
  },
  { deep: true, immediate: true }
)

const handleConfirm = () => {
  const finalResults = {
    // 过滤掉所有不合格的条目，确保只把有效的字符串数组传出去
    headlines: editableContent.headlines
      .filter(item => item && typeof item.original === 'string')
      .map((item) => item.original),
    descriptions: editableContent.descriptions
      .filter(item => item && typeof item.original === 'string')
      .map((item) => item.original),
  }
  // 发出带有正确数据的 confirm 信号
  emit('confirm', finalResults)
}

const regenerateItem = (type: 'headline' | 'description', index: number) => {
  const key = `${type}s` as keyof AiResults;
  const item = editableContent[key][index];

  if (!item) {
    console.error(`无法在索引 ${index} 处找到要重生成的 ${type}`);
    return;
  }

  emit('regenerate-item', {
    type,
    index,
    original: item.original,
  });
};
</script>

<style scoped>
/* 样式部分无需改动 */
.edit-area {
  max-height: 75vh;
  overflow-y: auto;
  padding: 0 10px;
}
.edit-header {
  display: grid;
  grid-template-columns: calc(50% - 40px) calc(50% - 40px) 80px;
  gap: 20px;
  padding: 0 10px;
  margin-bottom: 8px;
}
.column-header {
  font-weight: bold;
  color: #303133;
}
.edit-content {
  padding-right: 5px;
}
.edit-row {
  display: grid;
  grid-template-columns: calc(50% - 40px) calc(50% - 40px) 80px;
  gap: 20px;
  margin-bottom: 15px;
  align-items: center;
}
.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.input-with-meta {
  position: relative;
}
.meta-info {
  position: absolute;
  right: 10px;
  bottom: 5px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 5px;
  background-color: #fff;
  padding: 0 3px;
}
.char-count-error {
  color: #f56c6c;
  font-weight: bold;
}
.error-icon {
  color: #f56c6c;
  cursor: pointer;
}
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

