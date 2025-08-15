// 文件: src/socket.ts

import { io } from 'socket.io-client'

// 1. 在这里统一定义您后端的地址
const URL = 'http://localhost:3006'

// 2. 创建一个单一的、可共享的 socket 实例
export const socket = io(URL, {
  autoConnect: false, // 我们将手动控制何时连接
})
