import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 md:p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold tracking-tight">Sketch & Guess</h1>
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Çiz ve Tahmin Et!
        </p>
      </div>

      <div className="grid w-full max-w-5xl items-center gap-6 md:grid-cols-2">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Çok Oyunculu Mod</CardTitle>
            <CardDescription>Arkadaşlarınla birlikte oyna ve kim daha iyi tahmin edebilecek gör!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              2-4 oyuncu ile oynayabileceğin çok oyunculu mod. Sırayla çizim yapın ve diğer oyuncuların tahminlerini
              bekleyin.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/multiplayer" className="w-full">
              <Button className="w-full">Oyuna Başla</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Yapay Zeka Modu</CardTitle>
            <CardDescription>Yapay zekaya karşı oyna ve çizim yeteneklerini test et!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Yapay zeka senin çizimlerini tahmin etmeye çalışacak. Ne kadar hızlı tahmin edebilecek?
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/ai-mode" className="w-full">
              <Button className="w-full">Yapay Zeka ile Oyna</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 grid w-full max-w-5xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nasıl Oynanır?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-primary"
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Çiz</p>
                <p className="text-sm text-muted-foreground">
                  Sana verilen kelimeyi çiz ve diğer oyuncuların tahmin etmesini bekle.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-primary"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M10 11h2v5"></path>
                  <path d="M10 11h4"></path>
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Tahmin Et</p>
                <p className="text-sm text-muted-foreground">Diğer oyuncuların çizimlerini tahmin et ve puan kazan.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-primary"
                >
                  <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-5.66-5.66A2.83 2.83 0 0 0 12 8z"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Kazan</p>
                <p className="text-sm text-muted-foreground">En çok puanı topla ve oyunu kazan!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
