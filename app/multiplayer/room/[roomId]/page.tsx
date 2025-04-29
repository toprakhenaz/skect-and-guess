"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CanvasDraw } from "@/components/canvas-draw"
import { ArrowLeft, Clock, Send, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import {
  joinRoom,
  leaveRoom,
  subscribeToDrawing,
  sendDrawingUpdate,
  subscribeToChat,
  sendMessage,
  subscribeToGameState,
  subscribeToPlayerChanges,
  cleanupChannels,
} from "@/lib/realtime"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { RealtimeChannel } from "@supabase/supabase-js"

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
  id?: number
  playerId: string
  playerName: string
  message: string
  isCorrectGuess: boolean
  timestamp: string
}

// Tahmin tipi
type Guess = {
  playerId: string
  playerName: string
  guess: string
  isCorrect: boolean
  timestamp: string
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
  const [guessTimeLeft, setGuessTimeLeft] = useState(30)
  const [message, setMessage] = useState("")
  const [guess, setGuess] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null)
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalRounds, setTotalRounds] = useState(3)
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "guess">("chat")
  const [hasGuessed, setHasGuessed] = useState(false)

  const roomChannelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const guessTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mesajları otomatik kaydır
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Odaya katıl
  useEffect(() => {
    const initializeRoom = async () => {
      try {
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

        // Odaya katıl ve presence durumunu ayarla
        roomChannelRef.current = joinRoom(roomId, playerId, playerName, isHost)

        // Çizim güncellemelerini dinle
        subscribeToDrawing(roomId, (drawingData) => {
          setCurrentDrawing(drawingData)

          // Çizim güncellendiğinde ve tahmin etme durumundaysak, tahmin sekmesine geç
          if (gameState === "guessing" && !isDrawing) {
            setActiveTab("guess")
            // Tahmin süresi başlat
            startGuessTimer()
          }
        })

        // Sohbet mesajlarını dinle
        subscribeToChat(roomId, (newMessage) => {
          setMessages((prev) => [
            ...prev,
            {
              id: newMessage.id,
              playerId: newMessage.playerId,
              playerName: newMessage.playerName,
              message: newMessage.message,
              isCorrectGuess: newMessage.isCorrectGuess || false,
              timestamp: newMessage.timestamp,
            },
          ])
        })

        // Oyun durumu değişikliklerini dinle
        subscribeToGameState(roomId, (roomData) => {
          if (roomData.status === "playing") {
            setGameState(isDrawing ? "playing" : "guessing")
            setRoundNumber(roomData.current_round)
            setTotalRounds(roomData.total_rounds)

            // Çizen oyuncu için kelimeyi ayarla
            if (isDrawing && roomData.current_word) {
              setCurrentWord(roomData.current_word)
            }
          } else if (roomData.status === "finished") {
            setGameState("gameEnd")
          }
        })

        // Oyuncu değişikliklerini dinle
        subscribeToPlayerChanges(roomId, (updatedPlayers) => {
          setPlayers(updatedPlayers)

          // Çizen oyuncuyu kontrol et
          const drawingPlayer = updatedPlayers.find((p) => p.is_drawing)
          if (drawingPlayer) {
            setIsDrawing(drawingPlayer.player_id === playerId)
          }
        })

        // Odadaki mevcut oyuncuları getir
        const { data: roomPlayers } = await supabase
          .from("players")
          .select("*")
          .eq("room_code", roomId)
          .order("created_at", { ascending: true })

        if (roomPlayers) {
          setPlayers(roomPlayers)
        }

        // Oda bilgilerini getir
        const { data: roomDetails } = await supabase.from("rooms").select("*").eq("room_code", roomId).single()

        if (roomDetails) {
          if (roomDetails.status === "playing") {
            // Çizen oyuncuyu kontrol et
            const drawingPlayer = roomPlayers?.find((p) => p.is_drawing)
            setIsDrawing(drawingPlayer?.player_id === playerId)

            setGameState(drawingPlayer?.player_id === playerId ? "playing" : "guessing")
            setRoundNumber(roomDetails.current_round)
            setTotalRounds(roomDetails.total_rounds)

            if (drawingPlayer?.player_id === playerId && roomDetails.current_word) {
              setCurrentWord(roomDetails.current_word)
            }
          }
        }

        // Mevcut mesajları getir
        const { data: roomMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("room_code", roomId)
          .order("created_at", { ascending: true })
          .limit(50)

        if (roomMessages) {
          setMessages(
            roomMessages.map((msg) => ({
              id: msg.id,
              playerId: msg.player_id,
              playerName: msg.player_name,
              message: msg.message,
              isCorrectGuess: msg.is_correct_guess,
              timestamp: msg.created_at,
            })),
          )
        }

        // Son çizimi getir
        const { data: latestDrawing } = await supabase
          .from("drawings")
          .select("*")
          .eq("room_code", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (latestDrawing) {
          setCurrentDrawing(latestDrawing.drawing_data)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Oda başlatma hatası:", error)
        toast({
          title: "Hata",
          description: "Oda yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
          variant: "destructive",
        })
        router.push("/multiplayer")
      }
    }

    initializeRoom()

    // Temizlik
    return () => {
      leaveRoom(roomId)
      cleanupChannels()

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (guessTimerRef.current) {
        clearInterval(guessTimerRef.current)
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

          // Süre dolduğunda çizim tamamlandı olayını tetikle
          if (gameState === "playing" && currentDrawing) {
            handleDrawingComplete()
          }

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
  }, [gameState, currentDrawing])

  // Tahmin süresi sayacı
  const startGuessTimer = () => {
    // Önceki sayacı temizle
    if (guessTimerRef.current) {
      clearInterval(guessTimerRef.current)
    }

    // Tahmin süresini sıfırla
    setGuessTimeLeft(30)
    setHasGuessed(false)

    // Yeni sayaç başlat
    guessTimerRef.current = setInterval(() => {
      setGuessTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(guessTimerRef.current as NodeJS.Timeout)

          // Süre dolduğunda ve henüz tahmin yapılmadıysa otomatik olarak boş tahmin gönder
          if (!hasGuessed && !isDrawing) {
            handleSubmitGuess()
          }

          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Oyunu başlat
  const startGame = async () => {
    if (!isHost) return

    try {
      // Rastgele bir kelime seç
      const words = [
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
      const randomWord = words[Math.floor(Math.random() * words.length)]

      // Rastgele bir oyuncu seç
      const randomPlayerIndex = Math.floor(Math.random() * players.length)
      const drawingPlayer = players[randomPlayerIndex]

      // Çizen oyuncuyu güncelle
      await supabase.from("players").update({ is_drawing: false }).eq("room_code", roomId)

      await supabase
        .from("players")
        .update({ is_drawing: true })
        .eq("room_code", roomId)
        .eq("player_id", drawingPlayer.player_id)

      // Oda durumunu güncelle
      await supabase
        .from("rooms")
        .update({
          status: "playing",
          current_word: randomWord,
          current_round: 1,
          total_rounds: totalRounds,
        })
        .eq("room_code", roomId)

      // Kendi durumumuzu güncelle
      setGameState(drawingPlayer.player_id === playerId ? "playing" : "guessing")
      setRoundNumber(1)
      setTimeLeft(60)
      setIsDrawing(drawingPlayer.player_id === playerId)

      if (drawingPlayer.player_id === playerId) {
        setCurrentWord(randomWord)
      }
    } catch (error) {
      console.error("Oyun başlatma hatası:", error)
      toast({
        title: "Hata",
        description: "Oyun başlatılırken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Mesaj gönder
  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      // Mesajı veritabanına kaydet
      const { data: newMessage, error } = await supabase
        .from("messages")
        .insert({
          room_code: roomId,
          player_id: playerId,
          player_name: playerName,
          message: message,
          is_correct_guess: false,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Realtime ile mesajı gönder
      sendMessage(roomId, playerId, playerName, message)

      // Mesaj kutusunu temizle
      setMessage("")
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error)
      toast({
        title: "Hata",
        description: "Mesaj gönderilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Tahmin gönder
  const handleSubmitGuess = async () => {
    try {
      // Tahmini kaydet
      setGuesses((prev) => [
        ...prev,
        {
          playerId,
          playerName,
          guess: guess.trim(),
          isCorrect: currentWord && guess.toLowerCase().trim() === currentWord.toLowerCase().trim(),
          timestamp: new Date().toISOString(),
        },
      ])

      // Tahmin doğruysa puan ekle
      if (currentWord && guess.toLowerCase().trim() === currentWord.toLowerCase().trim()) {
        // Tahmin eden oyuncuya puan ekle
        await supabase
          .from("players")
          .update({ score: players.find((p) => p.player_id === playerId)?.score + 10 || 10 })
          .eq("room_code", roomId)
          .eq("player_id", playerId)

        // Çizen oyuncuya puan ekle
        const drawingPlayer = players.find((p) => p.is_drawing)
        if (drawingPlayer) {
          await supabase
            .from("players")
            .update({ score: drawingPlayer.score + 5 })
            .eq("room_code", roomId)
            .eq("player_id", drawingPlayer.player_id)
        }

        // Doğru tahmin mesajı gönder
        await supabase.from("messages").insert({
          room_code: roomId,
          player_id: playerId,
          player_name: playerName,
          message: `*** DOĞRU TAHMİN: ${currentWord} ***`,
          is_correct_guess: true,
        })

        // Realtime ile mesajı gönder
        sendMessage(roomId, playerId, playerName, `*** DOĞRU TAHMİN: ${currentWord} ***`, true)
      }

      // Tahmin kutusunu temizle
      setGuess("")
      setHasGuessed(true)

      // Tahmin sekmesini kapat
      setActiveTab("chat")
    } catch (error) {
      console.error("Tahmin gönderme hatası:", error)
      toast({
        title: "Hata",
        description: "Tahmin gönderilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Çizimi kaydet
  const saveDrawing = (dataUrl: string) => {
    setCurrentDrawing(dataUrl)

    // Çizimi diğer oyunculara gönder
    sendDrawingUpdate(roomId, dataUrl)
  }

  // Çizimi tamamla
  const handleDrawingComplete = async () => {
    if (!currentDrawing) return

    try {
      // Çizimi veritabanına kaydet
      await supabase.from("drawings").insert({
        room_code: roomId,
        player_id: playerId,
        drawing_data: currentDrawing,
        word: currentWord,
      })

      // Tahmin süresini başlat
      startGuessTimer()

      // Tüm oyunculara bildirim gönder
      await supabase.from("messages").insert({
        room_code: roomId,
        player_id: "system",
        player_name: "Sistem",
        message: `Çizim tamamlandı! Tahmin için 30 saniyeniz var.`,
        is_correct_guess: false,
      })

      // Realtime ile mesajı gönder
      sendMessage(roomId, "system", "Sistem", `Çizim tamamlandı! Tahmin için 30 saniyeniz var.`)

      // Çizim tamamlandı, tahmin bekleniyor durumuna geç
      setGameState("guessing")

      // 30 saniye sonra tur sonu işlemleri
      setTimeout(() => {
        handleRoundEnd()
      }, 30000)
    } catch (error) {
      console.error("Çizim kaydetme hatası:", error)
      toast({
        title: "Hata",
        description: "Çizim kaydedilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Tur sonu işlemleri
  const handleRoundEnd = async () => {
    try {
      // Oda bilgilerini getir
      const { data: roomDetails } = await supabase
        .from("rooms")
        .select("current_round, total_rounds")
        .eq("room_code", roomId)
        .single()

      if (!roomDetails) return

      const { current_round, total_rounds } = roomDetails

      if (current_round >= total_rounds) {
        // Oyun bitti
        await supabase.from("rooms").update({ status: "finished" }).eq("room_code", roomId)

        setGameState("gameEnd")
      } else {
        // Sonraki tur
        // Yeni çizen oyuncuyu belirle
        const currentDrawingIndex = players.findIndex((p) => p.is_drawing)
        const nextDrawingIndex = (currentDrawingIndex + 1) % players.length
        const nextDrawingPlayer = players[nextDrawingIndex]

        // Çizen oyuncuyu güncelle
        await supabase.from("players").update({ is_drawing: false }).eq("room_code", roomId)

        await supabase
          .from("players")
          .update({ is_drawing: true })
          .eq("room_code", roomId)
          .eq("player_id", nextDrawingPlayer.player_id)

        // Yeni kelime seç
        const words = [
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
        const randomWord = words[Math.floor(Math.random() * words.length)]

        // Oda bilgilerini güncelle
        await supabase
          .from("rooms")
          .update({
            current_word: randomWord,
            current_round: current_round + 1,
          })
          .eq("room_code", roomId)

        // Kendi durumumuzu güncelle
        setGameState(nextDrawingPlayer.player_id === playerId ? "playing" : "guessing")
        setRoundNumber(current_round + 1)
        setTimeLeft(60)
        setCurrentDrawing(null)
        setIsDrawing(nextDrawingPlayer.player_id === playerId)
        setGuesses([])
        setHasGuessed(false)

        if (nextDrawingPlayer.player_id === playerId) {
          setCurrentWord(randomWord)
        } else {
          setCurrentWord("")
        }
      }
    } catch (error) {
      console.error("Tur sonu işleme hatası:", error)
      toast({
        title: "Hata",
        description: "Tur sonu işlenemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Oyunu bitir (oda sahibi için)
  const endGame = async () => {
    if (!isHost) return

    try {
      // Oyunu bitir
      await supabase.from("rooms").update({ status: "finished" }).eq("room_code", roomId)

      setGameState("gameEnd")
    } catch (error) {
      console.error("Oyun bitirme hatası:", error)
      toast({
        title: "Hata",
        description: "Oyun bitirilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    }
  }

  // Oyundan çık
  const leaveGame = async () => {
    try {
      // Oyuncunun bağlantı durumunu güncelle
      await supabase.from("players").update({ connected: false }).eq("room_code", roomId).eq("player_id", playerId)

      // Realtime kanallarından ayrıl
      leaveRoom(roomId)
      cleanupChannels()

      // Ana sayfaya yönlendir
      router.push("/multiplayer")
    } catch (error) {
      console.error("Oyundan çıkış hatası:", error)
      router.push("/multiplayer")
    }
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
                  <span>
                    {isDrawing
                      ? `${timeLeft} saniye`
                      : guessTimeLeft > 0
                        ? `Tahmin: ${guessTimeLeft} saniye`
                        : "Tahmin süresi doldu"}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    Tur: {roundNumber}/{totalRounds}
                  </div>
                  {isHost && gameState !== "gameEnd" && (
                    <Button variant="outline" size="sm" onClick={endGame}>
                      Oyunu Bitir
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                {isDrawing ? (
                  <>
                    <div className="p-2 text-center font-medium">
                      Çizilecek kelime: <span className="font-bold">{currentWord || "Kelime yükleniyor..."}</span>
                    </div>
                    <CanvasDraw onSave={saveDrawing} />

                    <div className="p-2 text-center">
                      <Button onClick={handleDrawingComplete} disabled={!currentDrawing}>
                        Çizimi Tamamla
                      </Button>
                    </div>
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
                  {!isDrawing && currentDrawing && (
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "chat" | "guess")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="chat">Sohbet</TabsTrigger>
                        <TabsTrigger value="guess">Tahmin Et</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                  {(isDrawing || !currentDrawing) && <CardTitle className="text-lg">Sohbet</CardTitle>}
                </CardHeader>

                <TabsContent value="chat" className="flex-1 flex flex-col">
                  <CardContent className="h-[300px] overflow-y-auto p-4">
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`rounded-lg p-2 ${
                            msg.isCorrectGuess ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                          }`}
                        >
                          <div className="font-medium">{msg.playerName}</div>
                          <div>{msg.message}</div>
                        </div>
                      ))}
                      {messages.length === 0 && <p className="text-sm text-muted-foreground">Henüz mesaj yok</p>}
                      <div ref={messagesEndRef} />
                    </div>
                  </CardContent>
                  <CardFooter className="p-4">
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        placeholder="Mesaj yazın..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      />
                      <Button size="icon" onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Gönder</span>
                      </Button>
                    </div>
                  </CardFooter>
                </TabsContent>

                <TabsContent value="guess" className="flex-1 flex flex-col">
                  <CardContent className="h-[300px] overflow-y-auto p-4">
                    <div className="space-y-2">
                      {guesses.length > 0 ? (
                        guesses.map((guess, index) => (
                          <div
                            key={index}
                            className={`rounded-lg p-2 ${
                              guess.isCorrect ? "bg-green-100 dark:bg-green-900" : "bg-muted"
                            }`}
                          >
                            <div className="font-medium">{guess.playerName}</div>
                            <div>{guess.guess || "Boş tahmin"}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Henüz tahmin yapılmadı</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4">
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        placeholder="Tahmininizi yazın..."
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !hasGuessed && handleSubmitGuess()}
                        disabled={hasGuessed || guessTimeLeft <= 0}
                      />
                      <Button size="icon" onClick={handleSubmitGuess} disabled={hasGuessed || guessTimeLeft <= 0}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Tahmin Gönder</span>
                      </Button>
                    </div>
                    {hasGuessed && <p className="mt-2 text-sm text-muted-foreground">Tahmininiz gönderildi.</p>}
                    {guessTimeLeft <= 0 && !hasGuessed && (
                      <p className="mt-2 text-sm text-muted-foreground">Tahmin süresi doldu.</p>
                    )}
                  </CardFooter>
                </TabsContent>
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

            <p className="text-sm text-muted-foreground">Sonraki tur başlatılıyor...</p>
          </div>
        )

      case "gameEnd":
        // Find the winner
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
