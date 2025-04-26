import { Server } from "socket.io"
import { NextResponse } from "next/server"

// Kelime listesi
const WORDS = [
  "elma",
  "araba",
  "ev",
  "ağaç",
  "güneş",
  "ay",
  "yıldız",
  "kitap",
  "kalem",
  "masa",
  "sandalye",
  "kapı",
  "pencere",
  "telefon",
  "bilgisayar",
  "kuş",
  "kedi",
  "köpek",
  "balık",
  "çiçek",
]

// Socket.io sunucusu
export async function GET(req: Request) {
  try {
    // @ts-ignore - Socket.io'nun Next.js API Route ile entegrasyonu
    const io = new Server({
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    // Bağlantı olayını dinle
    io.on("connection", (socket) => {
      console.log("Yeni bağlantı:", socket.id)

      // Odaya katılma
      socket.on("join-room", ({ roomCode, playerId, playerName }) => {
        socket.join(roomCode)

        // Odaya katıldığını diğer oyunculara bildir
        socket.to(roomCode).emit("player-joined", { playerId, playerName })

        // Odadaki tüm oyuncuları getir ve yeni oyuncuya gönder
        // Not: Gerçek uygulamada bu verileri Supabase'den alacağız
        io.to(roomCode).emit("room-update", { message: `${playerName} odaya katıldı` })
      })

      // Oyunu başlatma
      socket.on("start-game", ({ roomCode, rounds = 3 }) => {
        // Rastgele bir kelime seç
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)]

        // Tüm oyunculara oyunun başladığını bildir
        io.to(roomCode).emit("game-started", {
          currentRound: 1,
          totalRounds: rounds,
          word: randomWord,
        })
      })

      // Çizim güncelleme
      socket.on("drawing-update", ({ roomCode, drawingData, playerId }) => {
        // Çizimi diğer oyunculara gönder
        socket.to(roomCode).emit("drawing-update", { drawingData, playerId })
      })

      // Mesaj gönderme
      socket.on("send-message", ({ roomCode, playerId, playerName, message }) => {
        // Mesajı tüm oyunculara gönder
        io.to(roomCode).emit("new-message", {
          playerId,
          playerName,
          message,
          isCorrectGuess: false,
        })
      })

      // Odadan ayrılma
      socket.on("leave-room", ({ roomCode, playerId }) => {
        // Diğer oyunculara bildir
        socket.to(roomCode).emit("player-left", { playerId })

        // Odadan ayrıl
        socket.leave(roomCode)
      })

      // Bağlantı kesildiğinde
      socket.on("disconnect", () => {
        console.log("Bağlantı kesildi:", socket.id)
      })
    })

    // Socket.io sunucusunu başlat
    await io.listen(3000)

    return new NextResponse("Socket.io sunucusu başlatıldı", { status: 200 })
  } catch (error) {
    console.error("Socket.io sunucusu başlatma hatası:", error)
    return new NextResponse("Socket.io sunucusu başlatılamadı", { status: 500 })
  }
}
