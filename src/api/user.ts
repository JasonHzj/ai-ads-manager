// =======================================================================
// 第二步: 创建API服务层 - src/api/user.ts
// 作用: 封装所有与后端用户接口的通信。
// =======================================================================

// 文件: src/api/user.ts

import axios from 'axios'

// 创建一个axios实例，并配置基础URL
const apiClient = axios.create({
  baseURL: 'http://localhost:3006/api', // 您的后端API基础地址
  timeout: 5000, // 请求超时时间
})

// 定义登录请求的函数
export const loginAPI = (data: any) => {
  return apiClient.post('/login', data)
}

// 定义注册请求的函数
export const registerAPI = (data: any) => {
  return apiClient.post('/register', data)
}
