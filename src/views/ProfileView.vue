<template>
  <div class="profile-view">
    <el-tabs v-model="activeTab" class="profile-tabs">
      <el-tab-pane label="个人资料" name="profile">
        <UserProfile />
      </el-tab-pane>
      <el-tab-pane label="API密钥管理" name="apiKeys">
        <ApiKeysManager />
      </el-tab-pane>
      <el-tab-pane v-if="userStore.userInfo?.role === 'admin'" label="管理员面板" name="admin">
        <AdminPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import UserProfile from '@/components/UserProfile.vue';
import ApiKeysManager from '@/components/ApiKeysManager.vue';
import AdminPanel from '@/components/AdminPanel.vue';

const userStore = useUserStore();
const activeTab = ref('profile');
</script>

<style scoped>
.profile-view {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  height: 100%;
}
</style>
