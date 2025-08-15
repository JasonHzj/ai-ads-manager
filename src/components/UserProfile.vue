<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>修改个人资料</span>
      </div>
    </template>
    <el-form :model="form" label-width="120px" style="max-width: 600px">
      <el-form-item label="用户名">
        <el-input :value="userStore.userInfo?.username" disabled />
      </el-form-item>
      <el-form-item>
         <template #label>
    <el-tooltip
      effect="dark"
      content="仅限OpenRouter.ai"
      placement="top"
    >
      <span>OpenRouter Key</span>
    </el-tooltip>
  </template>
        <el-input v-model="form.open_router_api_key" type="password" show-password placeholder="请输入您的OpenRouter API密钥" />
      </el-form-item>
      <el-divider>修改密码</el-divider>
      <el-form-item label="旧密码">
        <el-input v-model="form.old_password" type="password" show-password placeholder="请输入旧密码" />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="form.new_password" type="password" show-password placeholder="请输入新密码" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleUpdateProfile">保存更新</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { getMyProfileAPI, updateMyProfileAPI } from '@/api/profile';
import { ElMessage } from 'element-plus';

const userStore = useUserStore();
const form = ref({
  open_router_api_key: '',
  old_password: '',
  new_password: '',
});

const fetchProfile = async () => {
  const res = await getMyProfileAPI();
  if (res.data.status === 0) {
    form.value.open_router_api_key = res.data.data.open_router_api_key || '';
  }
};

onMounted(fetchProfile);

const handleUpdateProfile = async () => {
  try {
    const res = await updateMyProfileAPI(form.value);
    if (res.data.status === 0) {
      ElMessage.success('个人资料更新成功！');
      form.value.old_password = '';
      form.value.new_password = '';
    }
  } catch (error) {
    // 错误消息已由API拦截器处理
  }
};
</script>
