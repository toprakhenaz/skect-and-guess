import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // Bağlantı URL'i
    const socketUrl = typeof window !== "undefined" ? window.location.origin : ""
    
    console.log('Socket.IO bağlantısı kurulacak URL:', socketUrl)
    
    // Socket.io bağlantısını kur
    socket = io(socketUrl, {
      path: '/api/socket/io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    })
    
    // Bağlantı olaylarını izle
    socket.on('connect', () => {
      console.log('Socket.IO bağlantısı kuruldu, socket ID:', socket?.id)
    })
    
    socket.on('connect_error', (error) => {
      console.error('Socket.IO bağlantı hatası:', error.message)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO bağlantısı kesildi, sebep:', reason)
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    console.log('Socket.IO bağlantısı kapatılıyor...')
    socket.disconnect()
    socket = null
  }
}