"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CanvasDraw } from "@/components/canvas-draw"
import { ArrowLeft, Clock, Brain } from "lucide-react"
import Link from "next/link"

// Örnek kelimeler
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
  "deniz",
  "dağ",
  "nehir",
  "göl",
  "orman",
]

// Oyun durumları
type GameState = "waiting" | "drawing" | "aiGuessing" | "roundEnd" | "gameEnd"

export default function AiModePage() {
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [currentWord, setCurrentWord] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null)
  const [aiGuesses, setAiGuesses] = useState<{ guess: string; confidence: number }[]>([])
  const [aiCorrectGuess, setAiCorrectGuess] = useState<boolean>(false)

  // Oyunu başlat
  const startGame = () => {
    // Rastgele bir kelime seç
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)]
    setCurrentWord(randomWord)

    // Oyun durumunu güncelle
    setGameState("drawing")

    // Süreyi başlat
    setTimeLeft(60)
  }

  // Süre sayacı
  useEffect(() => {
    if (gameState !== "drawing") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (currentDrawing) {
            setGameState("aiGuessing")
            simulateAiGuessing()
          } else {
            setGameState("roundEnd")
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, currentDrawing])

  // Çizimi kaydet
  const saveDrawing = (dataUrl: string) => {
    setCurrentDrawing(dataUrl)
  }

  // Çizimi tamamla
  const finishDrawing = () => {
    if (!currentDrawing) return

    setGameState("aiGuessing")
    simulateAiGuessing()
  }

  // Yapay zeka tahminlerini simüle et
  const simulateAiGuessing = () => {
    // Gerçek bir uygulamada, burada çizimi bir AI API'sine gönderirsiniz
    // Şimdilik rastgele tahminler üreteceğiz

    const simulatedGuesses: { guess: string; confidence: number }[] = []
    const correctGuessIndex = Math.floor(Math.random() * 5) // 0-4 arası rastgele bir indeks

    // Rastgele kelimeler ve doğru kelime için güven skorları oluştur
    for (let i = 0; i < 5; i++) {
      if (i === correctGuessIndex) {
        // Doğru tahmin
        simulatedGuesses.push({
          guess: currentWord,
          confidence: Math.random() * 0.3 + 0.7, // %70-%100 arası güven
        })
      } else {
        // Yanlış tahmin
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)]
        simulatedGuesses.push({
          guess:
            randomWord === currentWord
              ? WORDS[(Math.floor(Math.random() * WORDS.length) + 1) % WORDS.length]
              : randomWord,
          confidence: Math.random() * 0.6, // %0-%60 arası güven
        })
      }
    }

    // Güven skoruna göre sırala
    simulatedGuesses.sort((a, b) => b.confidence - a.confidence)

    // Yapay zeka tahminlerini göster
    let currentIndex = 0
    const guessInterval = setInterval(() => {
      if (currentIndex < simulatedGuesses.length) {
        setAiGuesses((prev) => [...prev, simulatedGuesses[currentIndex]])

        // Doğru tahmin kontrolü
        if (simulatedGuesses[currentIndex].guess === currentWord) {
          setAiCorrectGuess(true)

          // Doğru tahmin edildiğinde puan ekle
          // Güven skoruna göre puan hesapla (0-10 arası)
          const confidenceScore = Math.floor(simulatedGuesses[currentIndex].confidence * 10)
          setScore((prev) => prev + confidenceScore)

          // Tüm tahminleri gösterdikten sonra tur sonu
          setTimeout(() => {
            clearInterval(guessInterval)
            setGameState("roundEnd")
          }, 2000)
        }

        currentIndex++

        // Tüm tahminler gösterildi ve doğru tahmin yoksa
        if (currentIndex === simulatedGuesses.length && !aiCorrectGuess) {
          setTimeout(() => {
            clearInterval(guessInterval)
            setGameState("roundEnd")
          }, 2000)
        }
      } else {
        clearInterval(guessInterval)
      }
    }, 1000)
  }

  // Sonraki tura geç
  const nextRound = () => {
    if (roundNumber >= totalRounds) {
      setGameState("gameEnd")
      return
    }

    // Yeni kelime seç
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)]
    setCurrentWord(randomWord)

    // Çizimi ve tahminleri temizle
    setCurrentDrawing(null)
    setAiGuesses([])
    setAiCorrectGuess(false)

    // Tur sayısını artır
    setRoundNumber((prev) => prev + 1)

    // Oyun durumunu güncelle
    setGameState("drawing")

    // Süreyi sıfırla
    setTimeLeft(60)
  }

  // Oyunu yeniden başlat
  const restartGame = () => {
    setScore(0)
    setRoundNumber(1)
    setGameState("waiting")
    setCurrentDrawing(null)
    setAiGuesses([])
    setAiCorrectGuess(false)
  }

  // Oyun durumuna göre içerik
  const renderGameContent = () => {
    switch (gameState) {
      case "waiting":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Yapay Zeka Modu</h2>
            <p className="text-center text-muted-foreground">
              Bu modda, size verilen kelimeyi çizeceksiniz ve yapay zeka çiziminizi tahmin etmeye çalışacak.
              <br />
              Ne kadar iyi çizerseniz, yapay zeka o kadar hızlı ve doğru tahmin edecek!
            </p>
            <Button onClick={startGame}>Oyunu Başlat</Button>
          </div>
        )

      case "drawing":
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
                <div className="p-2 text-center font-medium">
                  Çizilecek kelime: <span className="font-bold">{currentWord}</span>
                </div>
                <CanvasDraw onSave={saveDrawing} />
              </div>

              <div className="mt-4 flex justify-center">
                <Button onClick={finishDrawing} disabled={!currentDrawing}>
                  Çizimi Tamamla
                </Button>
              </div>
            </div>

            <div className="flex flex-col">
              <Card className="flex-1">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Oyun Bilgisi</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Nasıl Oynanır?</h3>
                      <p className="text-sm text-muted-foreground">
                        Size verilen kelimeyi çizin. Yapay zeka çiziminizi tahmin etmeye çalışacak. Yapay zeka doğru
                        tahmin ederse, güven skoruna göre puan kazanırsınız.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium">İpuçları</h3>
                      <ul className="ml-4 list-disc text-sm text-muted-foreground">
                        <li>Basit ve net çizimler yapın</li>
                        <li>Çizimin tamamını kullanın</li>
                        <li>Detayları ekleyin ama karmaşık yapmayın</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <span>Toplam Puan:</span>
                      <span className="font-bold">{score}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )

      case "aiGuessing":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>Yapay Zeka Tahmin Ediyor...</span>
                </div>
                <div>
                  Tur: {roundNumber}/{totalRounds}
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="p-2 text-center font-medium">
                  Çizilen kelime: <span className="font-bold">{currentWord}</span>
                </div>
                {currentDrawing && (
                  <div className="flex justify-center p-2">
                    <img
                      src={currentDrawing || "/placeholder.svg"}
                      alt="Çizim"
                      className="max-w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <Card className="flex-1">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Yapay Zeka Tahminleri</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <div className="space-y-2">
                    {aiGuesses.map((guess, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-2 ${guess.guess === currentWord ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{guess.guess}</span>
                          <span>{Math.floor(guess.confidence * 100)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-background">
                          <div
                            className={`h-2 rounded-full ${guess.guess === currentWord ? "bg-green-500" : "bg-primary"}`}
                            style={{ width: `${guess.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {aiGuesses.length === 0 && (
                      <div className="flex items-center justify-center p-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <span>Toplam Puan:</span>
                      <span className="font-bold">{score}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )

      case "roundEnd":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Tur Sona Erdi!</h2>
            <p className="text-lg">
              Kelime: <span className="font-bold">{currentWord}</span>
            </p>

            {currentDrawing && (
              <div className="my-4">
                <img src={currentDrawing || "/placeholder.svg"} alt="Çizim" className="max-w-full rounded-lg border" />
              </div>
            )}

            <div className="my-4 w-full max-w-md">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Yapay Zeka Sonucu</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {aiCorrectGuess ? (
                    <div className="text-center">
                      <p className="text-green-600 dark:text-green-400">Yapay zeka doğru tahmin etti!</p>
                      <p className="mt-2">En yüksek güven skoru: {Math.floor(aiGuesses[0]?.confidence * 100 || 0)}%</p>
                      <p className="mt-1">Kazanılan puan: +{Math.floor(aiGuesses[0]?.confidence * 10 || 0)}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-red-600 dark:text-red-400">Yapay zeka tahmin edemedi!</p>
                      <p className="mt-2">
                        En yüksek tahmin: {aiGuesses[0]?.guess || "Tahmin yok"} (
                        {Math.floor(aiGuesses[0]?.confidence * 100 || 0)}%)
                      </p>
                      <p className="mt-1">Kazanılan puan: +0</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <span>Toplam Puan:</span>
                      <span className="font-bold">{score}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <Button onClick={nextRound}>{roundNumber >= totalRounds ? "Sonuçları Gör" : "Sonraki Tur"}</Button>
          </div>
        )

      case "gameEnd":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <h2 className="text-2xl font-bold">Oyun Bitti!</h2>

            <div className="my-4 text-center">
              <p className="text-lg">Toplam Puanınız:</p>
              <p className="text-3xl font-bold">{score}</p>
            </div>

            <div className="my-4 w-full max-w-md">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Performans Değerlendirmesi</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {score >= 40 ? (
                    <p className="text-center text-green-600 dark:text-green-400">
                      Harika! Çizimleriniz çok net ve anlaşılır. Yapay zeka kolayca tahmin edebildi.
                    </p>
                  ) : score >= 20 ? (
                    <p className="text-center text-yellow-600 dark:text-yellow-400">
                      İyi iş! Çizimleriniz anlaşılır ancak biraz daha detay ekleyebilirsiniz.
                    </p>
                  ) : (
                    <p className="text-center text-red-600 dark:text-red-400">
                      Daha fazla pratik yapmalısınız. Çizimlerinizi daha net ve tanınabilir hale getirin.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex space-x-4">
              <Button onClick={restartGame}>Yeniden Oyna</Button>
              <Link href="/">
                <Button variant="outline">Ana Sayfaya Dön</Button>
              </Link>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ana Sayfaya Dön
        </Link>
        <h1 className="text-2xl font-bold">Yapay Zeka Modu</h1>
      </div>

      {renderGameContent()}
    </div>
  )
}
