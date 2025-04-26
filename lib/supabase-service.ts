import { supabase } from "@/lib/supabase"

// Rastgele oda kodu oluştur
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Oda oluştur
export async function createRoom(hostId: string, hostName: string) {
  try {
    const roomCode = generateRoomCode()
    console.log("Oda oluşturuluyor:", roomCode, "Host:", hostId, hostName)

    // Odayı oluştur
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        host_id: hostId,
        status: "waiting",
        current_round: 1,
        total_rounds: 3,
      })
      .select()
      .single()

    if (roomError) {
      console.error("Oda oluşturma hatası:", roomError)
      return { error: roomError.message }
    }

    console.log("Oda oluşturuldu:", room)

    // Odaya host oyuncuyu ekle
    const { error: playerError } = await supabase.from("players").insert({
      room_code: roomCode,
      player_id: hostId,
      player_name: hostName,
      is_host: true,
      is_drawing: false,
      score: 0,
      connected: true,
    })

    if (playerError) {
      console.error("Oyuncu ekleme hatası:", playerError)
      // Oda oluşturuldu ama oyuncu eklenemedi, odayı sil
      await supabase.from("rooms").delete().eq("room_code", roomCode)
      return { error: playerError.message }
    }

    return { room }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return { error: "Beklenmeyen bir hata oluştu" }
  }
}

// Odaya oyuncu ekle
export async function addPlayerToRoom(roomCode: string, playerId: string, playerName: string) {
  try {
    console.log("Odaya oyuncu ekleniyor:", roomCode, playerId, playerName)

    // Odanın var olup olmadığını kontrol et
    const { data: room, error: roomError } = await supabase.from("rooms").select("*").eq("room_code", roomCode).single()

    if (roomError) {
      console.error("Oda bulunamadı:", roomError)
      return { error: "Oda bulunamadı" }
    }

    // Oyuncunun zaten odada olup olmadığını kontrol et
    const { data: existingPlayer, error: playerCheckError } = await supabase
      .from("players")
      .select("*")
      .eq("room_code", roomCode)
      .eq("player_id", playerId)
      .maybeSingle()

    if (existingPlayer) {
      console.log("Oyuncu zaten odada:", existingPlayer)
      // Oyuncu zaten odada, bağlantı durumunu güncelle
      const { error: updateError } = await supabase
        .from("players")
        .update({ connected: true })
        .eq("room_code", roomCode)
        .eq("player_id", playerId)

      if (updateError) {
        console.error("Oyuncu güncelleme hatası:", updateError)
        return { error: updateError.message }
      }

      return { player: existingPlayer }
    }

    // Yeni oyuncu ekle
    const { data: player, error: insertError } = await supabase
      .from("players")
      .insert({
        room_code: roomCode,
        player_id: playerId,
        player_name: playerName,
        is_host: false,
        is_drawing: false,
        score: 0,
        connected: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Oyuncu ekleme hatası:", insertError)
      return { error: insertError.message }
    }

    console.log("Oyuncu eklendi:", player)
    return { player }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return { error: "Beklenmeyen bir hata oluştu" }
  }
}

// Odadaki oyuncuları getir
export async function getRoomPlayers(roomCode: string) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Oyuncuları getirme hatası:", error)
      return { error: error.message }
    }

    return { players: data }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return { error: "Beklenmeyen bir hata oluştu" }
  }
}

// Oda bilgilerini getir
export async function getRoomDetails(roomCode: string) {
  try {
    const { data, error } = await supabase.from("rooms").select("*").eq("room_code", roomCode).single()

    if (error) {
      console.error("Oda bilgilerini getirme hatası:", error)
      return { error: error.message }
    }

    return { room: data }
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    return { error: "Beklenmeyen bir hata oluştu" }
  }
}
