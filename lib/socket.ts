import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    // Aynı domain üzerinde çalışan Socket.io sunucusuna bağlan
    const socketUrl = typeof window !== "undefined" ? window.location.origin : ""

    socket = io(socketUrl, {
      path: "/api/socket/io",
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
