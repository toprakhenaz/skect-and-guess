"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Copy, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

export default function MultiplayerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [activeTab, setActiveTab] = useState("join")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Oyuncu ID'si oluştur
  const [playerId] = useState(`player_${Date.now().toString(36)}`)

  // Rastgele oda kodu oluştur
  const [generatedCode] = useState(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  })

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      setError("Lütfen bir kullanıcı adı girin")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Oda oluşturma isteği:", playerId, username)

      // Oda kodu oluştur
      const roomCode = generatedCode

      // Odayı veritabanına ekle
      const { error: roomError } = await supabase.from("rooms").insert({
        room_code: roomCode,
        host_id: playerId,
        status: "waiting",
        current_round: 1,
        total_rounds: 3,
      })

      if (roomError) {
        console.error("Oda oluşturma hatası:", roomError)
        setError(`Oda oluşturulurken bir hata oluştu: ${roomError.message}`)
        toast({
          title: "Hata",
          description: `Oda oluşturulurken bir hata oluştu: ${roomError.message}`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Oyuncuyu odaya ekle
      const { error: playerError } = await supabase.from("players").insert({
        room_code: roomCode,
        player_id: playerId,
        player_name: username,
        is_host: true,
        is_drawing: false,
        score: 0,
        connected: true,
      })

      if (playerError) {
        console.error("Oyuncu ekleme hatası:", playerError)

        // Oda oluşturuldu ama oyuncu eklenemedi, odayı sil
        await supabase.from("rooms").delete().eq("room_code", roomCode)

        setError(`Oyuncu eklenirken bir hata oluştu: ${playerError.message}`)
        toast({
          title: "Hata",
          description: `Oyuncu eklenirken bir hata oluştu: ${playerError.message}`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      console.log("Oda oluşturuldu:", roomCode)

      // Oda oluşturuldu, oyun sayfasına yönlendir
      router.push(`/multiplayer/room/${roomCode}?name=${encodeURIComponent(username)}&id=${playerId}&host=true`)
    } catch (error: any) {
      console.error("Oda oluşturma hatası:", error)
      setError("Oda oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.")
      toast({
        title: "Hata",
        description: "Oda oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      setError("Lütfen bir kullanıcı adı girin")
      return
    }

    if (!roomCode.trim()) {
      setError("Lütfen bir oda kodu girin")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Odaya katılma isteği:", roomCode, playerId, username)

      // Odanın var olup olmadığını kontrol et
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single()

      if (roomError) {
        console.error("Oda bulunamadı:", roomError)
        setError("Belirtilen oda bulunamadı. Lütfen oda kodunu kontrol edin.")
        toast({
          title: "Hata",
          description: "Belirtilen oda bulunamadı. Lütfen oda kodunu kontrol edin.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Oyuncunun zaten odada olup olmadığını kontrol et
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from("players")
        .select("*")
        .eq("room_code", roomCode)
        .eq("player_id", playerId)
        .maybeSingle()

      if (existingPlayer) {
        // Oyuncu zaten odada, bağlantı durumunu güncelle
        await supabase.from("players").update({ connected: true }).eq("room_code", roomCode).eq("player_id", playerId)
      } else {
        // Yeni oyuncu ekle
        const { error: playerError } = await supabase.from("players").insert({
          room_code: roomCode,
          player_id: playerId,
          player_name: username,
          is_host: false,
          is_drawing: false,
          score: 0,
          connected: true,
        })

        if (playerError) {
          console.error("Oyuncu ekleme hatası:", playerError)
          setError(`Odaya katılırken bir hata oluştu: ${playerError.message}`)
          toast({
            title: "Hata",
            description: `Odaya katılırken bir hata oluştu: ${playerError.message}`,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      console.log("Odaya katıldı:", roomCode)

      // Odaya katıldı, oyun sayfasına yönlendir
      router.push(`/multiplayer/room/${roomCode}?name=${encodeURIComponent(username)}&id=${playerId}`)
    } catch (error: any) {
      console.error("Odaya katılma hatası:", error)
      setError("Odaya katılırken bir hata oluştu. Lütfen tekrar deneyin.")
      toast({
        title: "Hata",
        description: "Odaya katılırken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
          <h1 className="text-2xl font-bold">Çok Oyunculu Mod</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Oyuna Katıl</CardTitle>
            <CardDescription>Yeni bir oda oluştur veya mevcut bir odaya katıl</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="username"
                  placeholder="Kullanıcı adın"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="join">Odaya Katıl</TabsTrigger>
                  <TabsTrigger value="create">Oda Oluştur</TabsTrigger>
                </TabsList>
                <TabsContent value="join" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      id="roomCode"
                      placeholder="Oda kodu"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleJoinRoom}
                    disabled={!username.trim() || !roomCode.trim() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Katılınıyor...
                      </>
                    ) : (
                      "Odaya Katıl"
                    )}
                  </Button>
                </TabsContent>
                <TabsContent value="create" className="space-y-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 items-center gap-1.5">
                      <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                        {generatedCode}
                      </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={copyRoomCode}>
                      {copied ? <span className="h-4 w-4 text-xs">✓</span> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Kodu kopyala</span>
                    </Button>
                  </div>
                  <Button className="w-full" onClick={handleCreateRoom} disabled={!username.trim() || isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      "Oda Oluştur"
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-1 h-4 w-4" />
              <span>2-4 oyuncu</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
