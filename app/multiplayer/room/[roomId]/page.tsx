"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CanvasDraw } from "@/components/canvas-draw"
import { ArrowLeft, Clock, Send, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { getSocket, disconnectSocket } from "@/lib/socket"
import { useToast } from "@/components/ui/use-toast"

// Oyun durumları
type GameState = "waiting" | "playing" | "guessing" | "roundEnd" | "gameEnd"

// Oyuncu tipi
type Player = {
  player_id: string
  player_name: string
  is_host: boolean
  is_drawing: boolean
  score: number
  connected: boolean
}

// Mesaj tipi
type Message = {
  playerId: string
  playerName: string
  message: string
  isCorrectGuess: boolean
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const roomId = params.roomId as string
  const playerName = searchParams.get("name") || "Misafir"
  const playerId = searchParams.get("id") || `player_${Date.now().toString(36)}`
  const isHost = searchParams.get("host") === "true"

  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [currentWord, setCurrentWord] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null)
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalRounds, setTotalRounds] = useState(3)
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)

  const socket = useRef(getSocket())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Odaya katıl
  useEffect(() => {
    // Mevcut oyuncuyu ekle
    const currentPlayer = {
      player_id: playerId,
      player_name: playerName,
      is_host: isHost,
      is_drawing: false,
      score: 0,
      connected: true,
    }

    setPlayers([currentPlayer])

    // Socket.io bağlantısı
    const s = socket.current

    // Odaya katıl
    s.emit("join-room", { roomCode: roomId, playerId, playerName })

    // Oyuncu katıldı olayını dinle
    s.on("player-joined", ({ playerId: newPlayerId, playerName: newPlayerName }) => {
      toast({
        title: "Yeni Oyuncu",
        description: `${newPlayerName} odaya katıldı!`,
      })

      // Oyuncuları güncelle
      setPlayers((prev) => [
        ...prev,
        {
          player_id: newPlayerId,
          player_name: newPlayerName,
          is_host: false,
          is_drawing: false,
          score: 0,
          connected: true,
        },
      ])
    })

    // Oda güncellemesi dinle
    s.on("room-update", (data) => {
      console.log("Oda güncellemesi:", data)
      setIsLoading(false)
    })

    // Oyuncu ayrıldı olayını dinle
    s.on("player-left", ({ playerId: leftPlayerId }) => {
      setPlayers((prev) => prev.map((p) => (p.player_id === leftPlayerId ? { ...p, connected: false } : p)))
    })

    // Oyun başladı olayını dinle
    s.on("game-started", ({ currentRound, totalRounds, word }) => {
      setGameState(isHost ? "playing" : "guessing")
      setRoundNumber(currentRound)
      setTotalRounds(totalRounds)
      setTimeLeft(60)
      setIsDrawing(isHost) // İlk turda host çizer

      if (isHost) {
        setCurrentWord(word)
      }
    })

    // Çizim güncelleme olayını dinle
    s.on("drawing-update", ({ drawingData }) => {
      setCurrentDrawing(drawingData)
    })

    // Yeni mesaj olayını dinle
    s.on("new-message", (newMessage) => {
      setMessages((prev) => [...prev, newMessage])
    })

    setIsLoading(false)

    // Temizlik
    return () => {
      const s = socket.current
      s.emit("leave-room", { roomCode: roomId, playerId })
      s.off("player-joined")
      s.off("room-update")
      s.off("player-left")
      s.off("game-started")
      s.off("drawing-update")
      s.off("new-message")

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [roomId, playerId, playerName, isHost, router, toast])

  // Süre sayacı
  useEffect(() => {
    if (gameState !== "playing" && gameState !== "guessing") {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout)
          setGameState("roundEnd")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState])

  // Oyunu başlat
  const startGame = () => {
    if (!isHost) return

    socket.current.emit("start-game", { roomCode: roomId, rounds: totalRounds })
  }

  // Mesaj gönder
  const sendMessage = () => {
    if (!message.trim()) return

    socket.current.emit("send-message", {
      roomCode: roomId,
      playerId,
      playerName,
      message,
    })

    setMessage("")
  }

  // Çizimi kaydet
  const saveDrawing = (dataUrl: string) => {
    setCurrentDrawing(dataUrl)

    // Çizimi diğer oyunculara gönder
    socket.current.emit("drawing-update", {
      roomCode: roomId,
      drawingData: dataUrl,
      playerId,
    })
  }

  // Oyundan çık
  const leaveGame = () => {
    socket.current.emit("leave-room", { roomCode: roomId, playerId })
    disconnectSocket()
    router.push("/multiplayer")
  }

  // Oyun durumuna göre içerik
  const renderGameContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <Loader2 className="h-12 w-12 animate-spin" />
          <p>Oda yükleniyor...</p>
        </div>
      )
    }

    switch (gameState) {
      case "waiting":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Oyuncular Bekleniyor</h2>
            <div className="grid gap-2">
              {players.map((player) => (
                <div key={player.player_id} className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${player.connected ? "bg-green-500" : "bg-gray-300"}`} />
                  <span>
                    {player.player_name} {player.is_host ? "(Oda Sahibi)" : ""}
                  </span>
                </div>
              ))}
            </div>
            {isHost && (
              <Button onClick={startGame} disabled={players.length < 1}>
                Oyunu Başlat
              </Button>
            )}
            {!isHost && <p className="text-sm text-muted-foreground">Oda sahibinin oyunu başlatması bekleniyor...</p>}
          </div>
        )

      case "playing":
      case "guessing":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{timeLeft} saniye</span>
                </div>
                <div>
                  Tur: {roundNumber}/{totalRounds}
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                {isDrawing ? (
                  <>
                    <div className="p-2 text-center font-medium">
                      Çizilecek kelime: <span className="font-bold">{currentWord}</span>
                    </div>
                    <CanvasDraw onSave={saveDrawing} />
                  </>
                ) : (
                  <>
                    <div className="p-2 text-center font-medium">
                      {players.find((p) => p.is_drawing)?.player_name || "Bir oyuncu"} çiziyor...
                    </div>
                    {currentDrawing ? (
                      <div className="flex justify-center p-2">
                        <img
                          src={currentDrawing || "/placeholder.svg"}
                          alt="Çizim"
                          className="max-w-full rounded-lg border"
                        />
                      </div>
                    ) : (
                      <CanvasDraw readOnly />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <Card className="flex-1">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Sohbet</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] overflow-y-auto p-4">
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-2 ${msg.isCorrectGuess ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                      >
                        <div className="font-medium">{msg.playerName}</div>
                        <div>{msg.message}</div>
                      </div>
                    ))}
                    {messages.length === 0 && <p className="text-sm text-muted-foreground">Henüz mesaj yok</p>}
                  </div>
                </CardContent>
                <CardFooter className="p-4">
                  <div className="flex w-full items-center space-x-2">
                    <Input
                      placeholder="Tahmininizi yazın..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      disabled={isDrawing || gameState !== "guessing"}
                    />
                    <Button size="icon" onClick={sendMessage} disabled={isDrawing || gameState !== "guessing"}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Gönder</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              <div className="mt-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">Skor Tablosu</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {players
                        .sort((a, b) => b.score - a.score)
                        .map((player) => (
                          <div key={player.player_id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`h-2 w-2 rounded-full ${player.connected ? "bg-green-500" : "bg-gray-300"}`}
                              />
                              <span>
                                {player.player_name} {player.is_drawing ? "(Çiziyor)" : ""}
                              </span>
                            </div>
                            <span className="font-bold">{player.score}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )

      case "roundEnd":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Tur Sona Erdi!</h2>
            {currentWord && (
              <p className="text-lg">
                Kelime: <span className="font-bold">{currentWord}</span>
              </p>
            )}

            {currentDrawing && (
              <div className="my-4">
                <img src={currentDrawing || "/placeholder.svg"} alt="Çizim" className="max-w-full rounded-lg border" />
              </div>
            )}

            <div className="grid gap-2">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between space-x-4">
                    <span>{player.player_name}</span>
                    <span className="font-bold">{player.score} puan</span>
                  </div>
                ))}
            </div>

            <Button onClick={leaveGame}>Çıkış</Button>
          </div>
        )

      case "gameEnd":
        const winner = [...players].sort((a, b) => b.score - a.score)[0]

        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Oyun Bitti!</h2>

            <div className="my-4 text-center">
              <p className="text-lg">Kazanan:</p>
              <p className="text-3xl font-bold">{winner?.player_name || "Belirsiz"}</p>
              <p className="text-xl">{winner?.score || 0} puan</p>
            </div>

            <div className="grid gap-2">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div key={player.player_id} className="flex items-center justify-between space-x-4">
                    <span>
                      {index + 1}. {player.player_name}
                    </span>
                    <span className="font-bold">{player.score} puan</span>
                  </div>
                ))}
            </div>

            <div className="flex space-x-4">
              <Button variant="outline" onClick={leaveGame}>
                Çıkış
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/multiplayer" className="flex items-center text-sm font-medium text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Link>
          <h1 className="text-2xl font-bold">Oda: {roomId}</h1>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{players.length} oyuncu</span>
        </div>
      </div>

      {renderGameContent()}
    </div>
  )
}
