<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>Ads脚本 API密钥</span>
        <div  class="header-actions">
        <el-button type="primary" @click="handleGenerateKey">生成新密钥</el-button>
        </div>
      </div>
    </template>
    <el-table :data="apiKeys" style="width: 100%">
      <el-table-column prop="description" label="描述" />
      <el-table-column label="密钥 (点击复制)">
        <template #default="scope">
          <el-link @click="copyToClipboard(scope.row.api_key)">{{ scope.row.api_key.substring(0, 8) }}...{{ scope.row.api_key.substring(scope.row.api_key.length - 8) }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" />
      <el-table-column label="操作">
        <template #default="scope">
          <el-button link type="danger" @click="handleDeleteKey(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMyApiKeysAPI, generateApiKeyAPI, deleteApiKeyAPI } from '@/api/profile';
import { ElMessage, ElMessageBox } from 'element-plus';

// 1. 定义ApiKey类型接口
interface ApiKey {
  id: number;
  api_key: string;
  description: string;
  created_at: string;
}

const apiKeys = ref<ApiKey[]>([]);

const fetchApiKeys = async () => {
  const res = await getMyApiKeysAPI();
  if (res.data.status === 0) {
    // 2. 为 key 参数添加明确的 ApiKey 类型
    apiKeys.value = res.data.data.map((key: ApiKey) => ({
        ...key,
        created_at: new Date(key.created_at).toLocaleString()
    }));
  }
};

onMounted(fetchApiKeys);

const handleGenerateKey = async () => {
    const { value } = await ElMessageBox.prompt('请输入这个新密钥的描述（例如：主脚本）', '生成新密钥', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
    });
    const res = await generateApiKeyAPI(value || 'Ads Script Key');
    if (res.data.status === 0) {
        ElMessage.success('新密钥生成成功！');
        fetchApiKeys(); // 刷新列表
    }
};

const handleDeleteKey = async (keyId: number) => {
    await ElMessageBox.confirm('确定要删除这个API密钥吗？使用此密钥的脚本将无法再访问您的数据。', '请确认', { type: 'warning' });
    const res = await deleteApiKeyAPI(keyId);
    if (res.data.status === 0) {
        ElMessage.success('密钥删除成功！');
        fetchApiKeys(); // 刷新列表
    }
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    ElMessage.success('密钥已复制到剪贴板！');
};
</script>
<style scoped>
.card-header span {
  font-size: 16px;

}

.header-actions {
 float: right;
}
</style>
