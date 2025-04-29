import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "./supabase"

// Kanal önbelleği
const channelCache: Record<string, RealtimeChannel> = {}

// Kanal oluştur veya mevcut kanalı getir
export function getChannel(channelId: string): RealtimeChannel {
  if (!channelCache[channelId]) {
    channelCache[channelId] = supabase.channel(channelId)
  }

  return channelCache[channelId]
}

// Odaya katıl
export function joinRoom(roomCode: string, playerId: string, playerName: string, isHost = false) {
  const roomChannel = getChannel(`room:${roomCode}`)

  roomChannel
    .on("presence", { event: "sync" }, () => {
      const state = roomChannel.presenceState()
      console.log("Presence durumu güncellendi:", state)
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log(`Oyuncu katıldı: ${key}`, newPresences)
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log(`Oyuncu ayrıldı: ${key}`, leftPresences)
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomChannel.track({
          playerId,
          playerName,
          isHost,
          online: true,
          lastSeen: new Date().toISOString(),
        })
      }
    })

  return roomChannel
}

// Odadan ayrıl
export function leaveRoom(roomCode: string) {
  const channelId = `room:${roomCode}`
  if (channelCache[channelId]) {
    channelCache[channelId].unsubscribe()
    delete channelCache[channelId]
  }
}

// Çizim güncellemelerini dinle
export function subscribeToDrawing(roomCode: string, onDrawingUpdate: (drawingData: string) => void) {
  const drawingChannel = getChannel(`drawing:${roomCode}`)

  drawingChannel
    .on("broadcast", { event: "drawing" }, (payload) => {
      onDrawingUpdate(payload.drawingData)
    })
    .subscribe()

  return drawingChannel
}

// Çizim güncelleme gönder
export function sendDrawingUpdate(roomCode: string, drawingData: string) {
  const drawingChannel = getChannel(`drawing:${roomCode}`)

  drawingChannel.send({
    type: "broadcast",
    event: "drawing",
    drawingData,
  })
}

// Sohbet mesajlarını dinle
export function subscribeToChat(roomCode: string, onNewMessage: (message: any) => void) {
  const chatChannel = getChannel(`chat:${roomCode}`)

  chatChannel
    .on("broadcast", { event: "message" }, (payload) => {
      onNewMessage(payload)
    })
    .subscribe()

  return chatChannel
}

// Mesaj gönder
export function sendMessage(
  roomCode: string,
  playerId: string,
  playerName: string,
  message: string,
  isCorrectGuess = false,
) {
  const chatChannel = getChannel(`chat:${roomCode}`)

  chatChannel.send({
    type: "broadcast",
    event: "message",
    playerId,
    playerName,
    message,
    isCorrectGuess,
    timestamp: new Date().toISOString(),
  })
}

// Oyun durumu değişikliklerini dinle
export function subscribeToGameState(roomCode: string, onGameStateUpdate: (gameState: any) => void) {
  // Tek bir kanal kullan
  const gameStateChannel = getChannel(`gameState:${roomCode}`)

  gameStateChannel
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        onGameStateUpdate(payload.new)
      },
    )
    .subscribe()

  return gameStateChannel
}

// Oyuncu değişikliklerini dinle - Optimize edilmiş
export function subscribeToPlayerChanges(roomCode: string, onPlayerChanges: (players: any[]) => void) {
  // Tek bir kanal kullan
  const playersChannel = getChannel(`players:${roomCode}`)

  // Oyuncu değişikliklerini dinle ama her değişiklikte tüm oyuncuları çekme
  playersChannel
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "players",
        filter: `room_code=eq.${roomCode}`,
      },
      async (payload) => {
        // Değişiklik olduğunda tüm oyuncuları getir
        const { data } = await supabase
          .from("players")
          .select("*")
          .eq("room_code", roomCode)
          .order("created_at", { ascending: true })

        if (data) {
          onPlayerChanges(data)
        }
      },
    )
    .subscribe()

  return playersChannel
}

// Tüm kanalları temizle
export function cleanupChannels() {
  Object.values(channelCache).forEach((channel) => {
    channel.unsubscribe()
  })

  // Önbelleği temizle
  Object.keys(channelCache).forEach((key) => {
    delete channelCache[key]
  })
}
