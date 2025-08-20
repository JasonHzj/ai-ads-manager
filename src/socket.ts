// 文件: src/socket.ts

import { io } from 'socket.io-client'
import { useUserStore } from '@/stores/user'

const URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006'
console.log(`[Socket.IO Client] ==> 准备连接到: ${URL}`)

export const socket = io(URL, {
  autoConnect: false,
})

socket.on('connect', () => {
  console.log('[Socket.IO Client] ==> 成功连接到服务器!')

  const userStore = useUserStore()
  const token = userStore.token

  if (token) {
    // --- 在这里添加关键日志 ---
    console.log("[Socket.IO Client] ==> 正在发送 'join_room' 事件...")
    socket.emit('join_room', token)
  } else {
    console.warn('[Socket.IO Client] ==> 已连接，但未找到用户token，无法加入房间。')
  }
})

socket.on('disconnect', () => {
  console.log('[Socket.IO Client] ==> 与服务器断开连接。')
})
