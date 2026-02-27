"use client"

import { useEffect, useState } from "react"

interface SplashScreenProps {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    // After 2s, begin fade-out
    const fadeTimer = setTimeout(() => setFadingOut(true), 2000)
    // After fade-out completes (2s + 600ms), notify parent
    const doneTimer = setTimeout(() => onFinish(), 2600)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onFinish])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{
        transition: "opacity 600ms ease",
        opacity: fadingOut ? 0 : 1,
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      <h1 className="text-white text-4xl tracking-tight select-none font-sans">
        <span className="font-bold">Uppi</span>
      </h1>
    </div>
  )
}
