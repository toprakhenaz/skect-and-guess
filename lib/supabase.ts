import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Supabase istemcisini oluştur
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Hata ayıklama için bağlantıyı kontrol et
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Ayarlanmış" : "Ayarlanmamış")
console.log("Supabase Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Ayarlanmış" : "Ayarlanmamış")

// Oyun odası oluştur
export async function createRoom(hostId: string, hostName: string) {
  const roomCode = generateRoomCode()

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      room_code: roomCode,
      host_id: hostId,
      status: "waiting",
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Oda oluşturma hatası:", error)
    return null
  }

  // Odaya host oyuncuyu ekle
  await addPlayerToRoom(roomCode, hostId, hostName, true)

  return data
}

// Odaya oyuncu ekle
export async function addPlayerToRoom(roomCode: string, playerId: string, playerName: string, isHost = false) {
  const { data, error } = await supabase
    .from("players")
    .insert({
      room_code: roomCode,
      player_id: playerId,
      player_name: playerName,
      is_host: isHost,
      score: 0,
      is_drawing: false,
      connected: true,
    })
    .select()
    .single()

  if (error) {
    console.error("Oyuncu ekleme hatası:", error)
    return null
  }

  return data
}

// Odadaki oyuncuları getir
export async function getRoomPlayers(roomCode: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_code", roomCode)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Oyuncuları getirme hatası:", error)
    return []
  }

  return data
}

// Oda bilgilerini getir
export async function getRoomDetails(roomCode: string) {
  const { data, error } = await supabase.from("rooms").select("*").eq("room_code", roomCode).single()

  if (error) {
    console.error("Oda bilgilerini getirme hatası:", error)
    return null
  }

  return data
}

// Odanın durumunu güncelle
export async function updateRoomStatus(roomCode: string, status: "waiting" | "playing" | "finished") {
  const { error } = await supabase.from("rooms").update({ status }).eq("room_code", roomCode)

  if (error) {
    console.error("Oda durumu güncelleme hatası:", error)
    return false
  }

  return true
}

// Oyuncu puanını güncelle
export async function updatePlayerScore(roomCode: string, playerId: string, scoreToAdd: number) {
  const { data: player, error: fetchError } = await supabase
    .from("players")
    .select("score")
    .eq("room_code", roomCode)
    .eq("player_id", playerId)
    .single()

  if (fetchError) {
    console.error("Oyuncu bilgisi getirme hatası:", fetchError)
    return false
  }

  const newScore = (player?.score || 0) + scoreToAdd

  const { error } = await supabase
    .from("players")
    .update({ score: newScore })
    .eq("room_code", roomCode)
    .eq("player_id", playerId)

  if (error) {
    console.error("Puan güncelleme hatası:", error)
    return false
  }

  return true
}

// Çizen oyuncuyu güncelle
export async function updateDrawingPlayer(roomCode: string, playerId: string) {
  // Önce tüm oyuncuların çizim durumunu false yap
  await supabase.from("players").update({ is_drawing: false }).eq("room_code", roomCode)

  // Sonra belirtilen oyuncunun çizim durumunu true yap
  const { error } = await supabase
    .from("players")
    .update({ is_drawing: true })
    .eq("room_code", roomCode)
    .eq("player_id", playerId)

  if (error) {
    console.error("Çizen oyuncu güncelleme hatası:", error)
    return false
  }

  return true
}

// Rastgele oda kodu oluştur
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
