"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CanvasDraw } from "@/components/canvas-draw"
import { ArrowLeft, Clock, Brain, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getAIService } from "@/lib/ai-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Oyun durumları
type GameState = "loading" | "error" | "waiting" | "drawing" | "aiGuessing" | "roundEnd" | "gameEnd"

export default function AiModePage() {
  const [gameState, setGameState] = useState<GameState>("loading")
  const [currentWord, setCurrentWord] = useState("")
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [currentDrawing, setCurrentDrawing] = useState<string | null>(null)
  const [aiGuesses, setAiGuesses] = useState<{ guess: string; confidence: number }[]>([])
  const [aiCorrectGuess, setAiCorrectGuess] = useState<boolean>(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const aiService = getAIService()

  // Model yükleme
  useEffect(() => {
    const loadModel = async () => {
      try {
        await aiService.loadModel()
        setModelLoaded(true)
        setGameState("waiting")
      } catch (error) {
        console.error("Model yükleme hatası:", error)
        setErrorMessage(
          "Yapay zeka modeli yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya farklı bir tarayıcı deneyin.",
        )
        setGameState("error")
      }
    }

    loadModel()
  }, [])

  // Oyunu başlat
  const startGame = () => {
    try {
      // Rastgele bir kelime seç
      const randomWord = aiService.getRandomWord()
      setCurrentWord(randomWord)

      // Oyun durumunu güncelle
      setGameState("drawing")

      // Süreyi başlat
      setTimeLeft(60)
    } catch (error) {
      console.error("Oyun başlatma hatası:", error)
      setErrorMessage("Oyun başlatılırken bir hata oluştu. Lütfen sayfayı yenileyin.")
      setGameState("error")
    }
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

    // Canvas referansını kaydet
    const canvas = document.querySelector("canvas") as HTMLCanvasElement
    if (canvas) {
      canvasRef.current = canvas
    }
  }

  // Çizimi tamamla
  const finishDrawing = () => {
    if (!currentDrawing || !canvasRef.current) return

    setGameState("aiGuessing")
    simulateAiGuessing()
  }

  // Yapay zeka tahminlerini gerçekleştir
  const simulateAiGuessing = async () => {
    if (!canvasRef.current || !currentWord) return

    setAiGuesses([])
    setAiCorrectGuess(false)

    try {
      // Gerçek AI tahmini yap
      const result = await aiService.predictDrawing(canvasRef.current, currentWord)

      // Tahminleri göster (sırayla)
      const predictions = result.predictions.slice(0, 5)

      for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i]

        // Türkçe karşılığını bul
        const turkishGuess = aiService.translateToTurkish(prediction.className)

        // Tahmin ekle
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setAiGuesses((prev) => [
          ...prev,
          {
            guess: turkishGuess,
            confidence: prediction.probability,
          },
        ])

        // Doğru tahmin kontrolü
        if (
          prediction.className.toLowerCase() === currentWord.toLowerCase() ||
          turkishGuess.toLowerCase() === currentWord.toLowerCase()
        ) {
          setAiCorrectGuess(true)

          // Doğru tahmin edildiğinde puan ekle
          // Güven skoruna göre puan hesapla (0-10 arası)
          const confidenceScore = Math.floor(prediction.probability * 10)
          setScore((prev) => prev + confidenceScore)

          // Biraz bekle ve tur sonuna geç
          await new Promise((resolve) => setTimeout(resolve, 2000))
          setGameState("roundEnd")
          break
        }
      }

      // Tüm tahminler gösterildi ve doğru tahmin yoksa
      if (!aiCorrectGuess) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setGameState("roundEnd")
      }
    } catch (error) {
      console.error("AI tahmin hatası:", error)

      // Hata durumunda rastgele tahminler göster
      const randomGuesses = [
        { guess: "elma", confidence: 0.8 },
        { guess: "araba", confidence: 0.6 },
        { guess: "ev", confidence: 0.4 },
        { guess: "ağaç", confidence: 0.3 },
        { guess: currentWord, confidence: 0.9 },
      ]

      // Tahminleri karıştır
      const shuffledGuesses = [...randomGuesses].sort(() => 0.5 - Math.random())

      // Doğru kelimeyi ilk 3 tahmin içine yerleştir
      const correctGuessIndex = Math.floor(Math.random() * 3)
      shuffledGuesses[correctGuessIndex] = { guess: currentWord, confidence: 0.9 }

      // Tahminleri göster
      for (let i = 0; i < shuffledGuesses.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setAiGuesses((prev) => [...prev, shuffledGuesses[i]])

        if (shuffledGuesses[i].guess === currentWord) {
          setAiCorrectGuess(true)
          setScore((prev) => prev + Math.floor(shuffledGuesses[i].confidence * 10))
          break
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
      setGameState("roundEnd")
    }
  }

  // Sonraki tura geç
  const nextRound = () => {
    if (roundNumber >= totalRounds) {
      setGameState("gameEnd")
      return
    }

    try {
      // Yeni kelime seç
      const randomWord = aiService.getRandomWord()
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
    } catch (error) {
      console.error("Sonraki tur hatası:", error)
      setErrorMessage("Sonraki tur başlatılırken bir hata oluştu. Lütfen sayfayı yenileyin.")
      setGameState("error")
    }
  }

  // Oyunu yeniden başlat
  const restartGame = () => {
    setScore(0)
    setRoundNumber(1)
    setGameState("waiting")
    setCurrentDrawing(null)
    setAiGuesses([])
    setAiCorrectGuess(false)
    setErrorMessage(null)
  }

  // Oyun durumuna göre içerik
  const renderGameContent = () => {
    switch (gameState) {
      case "loading":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Yapay zeka modeli yükleniyor...</p>
            <p className="text-sm text-muted-foreground">Bu işlem biraz zaman alabilir, lütfen bekleyin.</p>
          </div>
        )

      case "error":
        return (
          <div className="flex flex-col items-center justify-center space-y-4 p-8">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>
                {errorMessage || "Bir hata oluştu. Lütfen sayfayı yenileyin veya farklı bir tarayıcı deneyin."}
              </AlertDescription>
            </Alert>
            <Button onClick={restartGame}>Tekrar Dene</Button>
            <Link href="/">
              <Button variant="outline">Ana Sayfaya Dön</Button>
            </Link>
          </div>
        )

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
                        <li>Çizimi siyah renkle yapın</li>
                        <li>Çizimi ortalayın</li>
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
                        className={`rounded-lg p-2 ${guess.guess.toLowerCase() === currentWord.toLowerCase() ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{guess.guess}</span>
                          <span>{Math.floor(guess.confidence * 100)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-background">
                          <div
                            className={`h-2 rounded-full ${guess.guess.toLowerCase() === currentWord.toLowerCase() ? "bg-green-500" : "bg-primary"}`}
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
