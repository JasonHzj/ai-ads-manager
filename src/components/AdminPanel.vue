<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>用户审核与权限管理</span>
      </div>
    </template>
    <el-table :data="users" style="width: 100%">
      <el-table-column prop="username" label="用户名" />
      <el-table-column label="角色">
        <template #default="scope">
          <el-select v-model="scope.row.role" @change="updateUserRole(scope.row.id, $event)">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="状态">
        <template #default="scope">
          <el-select v-model="scope.row.status" @change="updateUserStatus(scope.row.id, $event)">
            <el-option label="待审核" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="权限: AI投放页面">
        <template #default="scope">
          <el-switch v-model="scope.row.permissions.can_view_ai_jobs" @change="updatePermissions(scope.row)" />
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAllUsersAPI, updateUserStatusAndRoleAPI, updateUserPermissionsAPI } from '@/api/profile';
import { ElMessage } from 'element-plus';

// 定义User类型接口
interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  permissions: {
    can_view_ai_jobs: boolean;
  };
}

const users = ref<User[]>([]);

// ▼▼▼ 核心修正：在 fetchUsers 函数中增加JSON解析逻辑 ▼▼▼
const fetchUsers = async () => {
  try {
    const res = await getAllUsersAPI();
    if (res.data.status === 0) {
      users.value = res.data.data.map((user: any) => {
        let permissionsObject = user.permissions;

        // 检查 permissions 是否为字符串，如果是，则解析它
        if (typeof permissionsObject === 'string') {
          try {
            permissionsObject = JSON.parse(permissionsObject);
          } catch (e) {
            console.error(`解析用户 ${user.id} 的权限字符串失败:`, e);
            permissionsObject = {}; // 解析失败则给予空权限
          }
        }

        // 返回一个结构完整的用户对象
        return {
          ...user,
          permissions: permissionsObject || { can_view_ai_jobs: false } // 确保permissions总是一个对象
        };
      });
    }
  } catch (error) {
    // API层的拦截器已经处理了错误提示
  }
};
// ▲▲▲ 修正结束 ▲▲▲

onMounted(fetchUsers);

const updateUserStatus = async (userId: number, status: string) => {
  await updateUserStatusAndRoleAPI(userId, { status });
  ElMessage.success('用户状态更新成功！');
};

const updateUserRole = async (userId: number, role: string) => {
  await updateUserStatusAndRoleAPI(userId, { role });
  ElMessage.success('用户角色更新成功！');
};

const updatePermissions = async (user: User) => {
  await updateUserPermissionsAPI(user.id, user.permissions);
  ElMessage.success('用户权限更新成功！');
};
</script>
