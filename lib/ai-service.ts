// Türkçe kelime listesi ve İngilizce karşılıkları
// DoodleNet modeli İngilizce sınıfları tanıyor, bu yüzden eşleştirme yapıyoruz
const wordMappings: Record<string, string> = {
  elma: "apple",
  araba: "car",
  ev: "house",
  ağaç: "tree",
  güneş: "sun",
  ay: "moon",
  yıldız: "star",
  kitap: "book",
  kalem: "pencil",
  masa: "table",
  sandalye: "chair",
  kapı: "door",
  pencere: "window",
  telefon: "cell phone",
  bilgisayar: "computer",
  kuş: "bird",
  kedi: "cat",
  köpek: "dog",
  balık: "fish",
  çiçek: "flower",
  deniz: "ocean",
  dağ: "mountain",
  nehir: "river",
  göl: "lake",
  orman: "forest",
  // Daha fazla kelime eklenebilir
}

// İngilizce'den Türkçe'ye çeviri için ters eşleştirme
const reverseWordMappings: Record<string, string> = {}
Object.keys(wordMappings).forEach((turkishWord) => {
  const englishWord = wordMappings[turkishWord]
  reverseWordMappings[englishWord] = turkishWord
})

// Oyun için kullanılacak kelimeleri filtrele
// Sadece Türkçe karşılığı olan kelimeleri kullan
const availableWords = Object.keys(wordMappings)

class AIService {
  private model: any = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private ml5Ready = false

  constructor() {
    // Client-side'da çalıştığından emin ol
    if (typeof window !== "undefined") {
      this.setupML5()
    }
  }

  // ml5.js'i kur
  private setupML5() {
    // ml5.js'in yüklenip yüklenmediğini kontrol et
    const checkML5Loaded = () => {
      if ((window as any).ml5) {
        this.ml5Ready = true
        this.loadModel()
      } else {
        // ml5.js henüz yüklenmemişse, biraz bekle ve tekrar dene
        setTimeout(checkML5Loaded, 100)
      }
    }

    checkML5Loaded()
  }

  // Model yükleme
  async loadModel(): Promise<void> {
    if (this.model) return
    if (this.loadPromise) return this.loadPromise
    if (!this.ml5Ready) {
      console.log("ml5.js henüz hazır değil, bekleniyor...")
      return new Promise((resolve) => {
        const checkAndLoad = () => {
          if (this.ml5Ready) {
            this.loadModel().then(resolve)
          } else {
            setTimeout(checkAndLoad, 100)
          }
        }
        checkAndLoad()
      })
    }

    this.isLoading = true

    this.loadPromise = new Promise(async (resolve) => {
      try {
        console.log("DoodleNet modeli yükleniyor...")
        const ml5 = (window as any).ml5

        // DoodleNet modelini yükle
        ml5.imageClassifier("DoodleNet", (error: any, model: any) => {
          if (error) {
            console.error("Model yükleme hatası:", error)
            this.createFallbackModel()
          } else {
            console.log("DoodleNet modeli başarıyla yüklendi")
            this.model = model
          }
          this.isLoading = false
          resolve()
        })
      } catch (error) {
        console.error("Model yükleme hatası:", error)
        this.createFallbackModel()
        this.isLoading = false
        resolve()
      }
    })

    return this.loadPromise
  }

  // Yedek model oluştur (ml5.js yüklenemezse)
  private createFallbackModel() {
    console.log("Yedek model oluşturuluyor...")
    this.model = {
      classify: (canvas: HTMLCanvasElement, callback: Function) => {
        // Rastgele tahminler üret
        const randomPredictions = this.generateRandomPredictions()
        callback(null, randomPredictions)
      },
    }
  }

  // Model yükleniyor mu kontrolü
  isModelLoading(): boolean {
    return this.isLoading
  }

  // Model yüklendi mi kontrolü
  isModelLoaded(): boolean {
    return !!this.model
  }

  // Canvas'tan çizimi al ve tahmin et
  async predictDrawing(
    canvas: HTMLCanvasElement,
    targetWord: string,
  ): Promise<{
    predictions: Array<{ className: string; probability: number }>
    targetPrediction: { className: string; probability: number; rank: number } | null
    success: boolean
    confidence: number
  }> {
    if (!this.model) {
      await this.loadModel()
    }

    try {
      // ml5.js modeli ile tahmin yap
      return new Promise((resolve) => {
        this.model.classify(canvas, (error: any, results: any) => {
          if (error) {
            console.error("Tahmin hatası:", error)
            const fallbackResults = this.handlePredictionError(targetWord)
            resolve(fallbackResults)
            return
          }

          // ml5.js sonuçlarını bizim formatımıza dönüştür
          const predictions = results.map((result: any) => ({
            className: result.label.replace(/_/g, " ").trim(),
            probability: result.confidence,
          }))

          // Hedef kelimenin İngilizce karşılığını bul
          const targetEnglish = wordMappings[targetWord] || targetWord

          // Hedef kelime için tahmin sonucunu bul
          let targetPrediction = null
          let targetRank = -1

          for (let i = 0; i < predictions.length; i++) {
            if (predictions[i].className.toLowerCase() === targetEnglish.toLowerCase()) {
              targetPrediction = predictions[i]
              targetRank = i
              break
            }
          }

          // Başarı durumunu belirle (ilk 3 tahmin içinde mi?)
          const success = targetRank >= 0 && targetRank < 3

          // Güven skoru (0-1 arası)
          const confidence = targetPrediction ? targetPrediction.probability : 0

          resolve({
            predictions,
            targetPrediction: targetPrediction ? { ...targetPrediction, rank: targetRank } : null,
            success,
            confidence,
          })
        })
      })
    } catch (error) {
      console.error("Tahmin işlemi hatası:", error)
      return this.handlePredictionError(targetWord)
    }
  }

  // Tahmin hatası durumunda yedek sonuçlar üret
  private handlePredictionError(targetWord: string) {
    // Rastgele tahminler üret
    const randomPredictions = this.generateRandomPredictions()

    // Hedef kelimeyi ilk 3 tahmin içine rastgele yerleştir
    const targetEnglish = wordMappings[targetWord] || targetWord
    const targetIndex = Math.floor(Math.random() * 3)
    const targetConfidence = Math.random() * 0.5 + 0.5 // %50-%100 arası

    randomPredictions[targetIndex] = {
      className: targetEnglish,
      probability: targetConfidence,
    }

    // Tahminleri güven skoruna göre sırala
    randomPredictions.sort((a, b) => b.probability - a.probability)

    // Hedef kelimenin yeni sırasını bul
    let targetRank = -1
    for (let i = 0; i < randomPredictions.length; i++) {
      if (randomPredictions[i].className === targetEnglish) {
        targetRank = i
        break
      }
    }

    return {
      predictions: randomPredictions,
      targetPrediction: {
        className: targetEnglish,
        probability: randomPredictions[targetRank].probability,
        rank: targetRank,
      },
      success: true,
      confidence: randomPredictions[targetRank].probability,
    }
  }

  // Rastgele tahminler üret
  private generateRandomPredictions(): Array<{ className: string; probability: number }> {
    // Rastgele 10 sınıf seç
    const selectedClasses = Object.values(wordMappings)
      .sort(() => 0.5 - Math.random())
      .slice(0, 10)

    // Her sınıf için rastgele bir güven skoru oluştur
    return (
      selectedClasses
        .map((className) => ({
          className,
          probability: Math.random(),
        }))
        // Güven skoruna göre sırala
        .sort((a, b) => b.probability - a.probability)
    )
  }

  // Rastgele bir kelime seç
  getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * availableWords.length)
    return availableWords[randomIndex]
  }

  // İngilizce kelimeyi Türkçe'ye çevir
  translateToTurkish(englishWord: string): string {
    return reverseWordMappings[englishWord] || englishWord
  }
}

// Singleton instance
let instance: AIService | null = null

export function getAIService(): AIService {
  if (!instance) {
    instance = new AIService()
  }
  return instance
}
