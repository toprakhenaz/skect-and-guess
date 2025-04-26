import { Server as NetServer } from 'http'
import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiResponseServerIO } from '@/types/socket'

// Global değişken olarak Socket.IO sunucusunu tanımla
let io: SocketIOServer

// Kelime listesi
const WORDS = [
  "elma", "araba", "ev", "ağaç", "güneş", "ay", "yıldız", "kitap", "kalem", "masa",
  "sandalye", "kapı", "pencere", "telefon", "bilgisayar", "kuş", "kedi", "köpek", 
  "balık", "çiçek", "deniz", "dağ", "nehir", "göl", "orman"
]

// Oda oyuncularını takip etmek için obje
const roomPlayers: Record<string, Array<{playerId: string, playerName: string, socketId: string}>> = {}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const forceNew = searchParams.get('forceNew') === 'true'

  try {
    // Socket.IO sunucusu zaten varsa ve yeni oluşturma zorunlu değilse
    if (io && !forceNew) {
      return new Response('Socket.IO already running', { status: 200 })
    }

    // @ts-ignore - Next.js'in res.socket'i için tip tanımlaması yok
    const res: NextApiResponseServerIO = new Response(null, { status: 200 })

    // HTTP sunucusuna erişim sağla
    const httpServer: NetServer = res.socket?.server
    
    if (!httpServer) {
      return new Response('HTTP server not available', { status: 500 })
    }

    // Socket.IO sunucusunu oluştur
    io = new SocketIOServer(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    // Bağlantı olayını dinle
    io.on('connection', (socket) => {
      console.log('Yeni bağlantı:', socket.id)

      // Odaya katılma
      socket.on('join-room', ({ roomCode, playerId, playerName }) => {
        console.log(`Oyuncu ${playerName} (${playerId}) ${roomCode} odasına katıldı`)
        
        // Oyuncu bilgilerini socket verisine ekle
        socket.data.playerId = playerId
        socket.data.playerName = playerName
        socket.data.roomCode = roomCode
        
        // Odaya katıl
        socket.join(roomCode)
        
        // Oda oyuncularını takip et
        if (!roomPlayers[roomCode]) {
          roomPlayers[roomCode] = []
        }
        
        // Eğer oyuncu zaten varsa listeye ekleme
        if (!roomPlayers[roomCode].find(p => p.playerId === playerId)) {
          roomPlayers[roomCode].push({
            playerId,
            playerName,
            socketId: socket.id
          })
        }

        // Katılan oyuncuya odadaki tüm oyuncuları gönder
        socket.emit('room-players', roomPlayers[roomCode])
        
        // Diğer oyunculara yeni oyuncunun katıldığını bildir
        socket.to(roomCode).emit('player-joined', { playerId, playerName })
        
        // Odanın güncellendiğini bildir
        io.to(roomCode).emit('room-update', { 
          message: `${playerName} odaya katıldı`,
          players: roomPlayers[roomCode]
        })
      })

      // Oyunu başlatma
      socket.on('start-game', ({ roomCode, rounds = 3 }) => {
        // Rastgele bir kelime seç
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)]
        
        console.log(`${roomCode} odasında oyun başlatılıyor. Kelime: ${randomWord}`)
        
        // Tüm oyunculara oyunun başladığını bildir
        io.to(roomCode).emit('game-started', {
          currentRound: 1,
          totalRounds: rounds,
          word: randomWord,
        })
      })

      // Çizim güncelleme
      socket.on('drawing-update', ({ roomCode, drawingData, playerId }) => {
        // Çizimi diğer oyunculara gönder
        socket.to(roomCode).emit('drawing-update', { drawingData, playerId })
      })

      // Mesaj gönderme
      socket.on('send-message', ({ roomCode, playerId, playerName, message }) => {
        console.log(`${roomCode} odasında ${playerName} mesaj gönderdi: ${message}`)
        
        // Mesajı tüm oyunculara gönder
        io.to(roomCode).emit('new-message', {
          playerId,
          playerName,
          message,
          isCorrectGuess: false,
        })
      })

      // Odadan ayrılma
      socket.on('leave-room', ({ roomCode, playerId }) => {
        if (!roomCode || !playerId) return
        
        console.log(`Oyuncu ${playerId} ${roomCode} odasından ayrıldı`)
        
        // Odadan ayrıl
        socket.leave(roomCode)
        
        // Oyuncuyu listeden çıkar
        if (roomPlayers[roomCode]) {
          roomPlayers[roomCode] = roomPlayers[roomCode].filter(p => p.playerId !== playerId)
          
          // Diğer oyunculara bildir
          io.to(roomCode).emit('player-left', { 
            playerId,
            remainingPlayers: roomPlayers[roomCode]
          })
        }
      })

      // Bağlantı kesildiğinde
      socket.on('disconnect', () => {
        console.log('Bağlantı kesildi:', socket.id)
        
        // Kullanıcı bir odadaysa
        const { roomCode, playerId } = socket.data
        if (roomCode && playerId) {
          // Oyuncuyu listeden çıkar
          if (roomPlayers[roomCode]) {
            roomPlayers[roomCode] = roomPlayers[roomCode].filter(p => p.playerId !== playerId)
            
            // Diğer oyunculara bildir
            io.to(roomCode).emit('player-left', { 
              playerId,
              remainingPlayers: roomPlayers[roomCode]
            })
          }
        }
      })
    })

    res.socket.server.io = io
    
    return new Response('Socket.IO server started', { status: 200 })
  } catch (error) {
    console.error('Socket.IO server error:', error)
    return new Response(`Socket.IO server error: ${error}`, { status: 500 })
  }
}