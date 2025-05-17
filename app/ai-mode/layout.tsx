import type React from "react"
import Script from "next/script"

export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ml5.js kütüphanesini yükle */}
      <Script src="https://unpkg.com/ml5@latest/dist/ml5.min.js" strategy="beforeInteractive" />
      {children}
    </>
  )
}
