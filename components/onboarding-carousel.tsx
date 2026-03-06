"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { StarBurst } from "@/components/star-burst"
import { UppiLogo } from "@/components/revolut-logo"

const TOTAL_SLIDES = 5
const SLIDE_DURATION = 5000

const slides = [
  {
    id: 0,
    title: "Go beyond business as usual",
    bg: "#000000",
    themeColor: "#000000",
    textColor: "white",
    image: "/revolut-coin.jpg",
    imageAlt: "Corrida urbana Uppi",
    animated: true,
    logoBg: "white",
    logoColor: "black",
    headerTextColor: "rgba(255,255,255,0.9)",
  },
  {
    id: 1,
    title: "Link and sync your tools",
    bg: "#0f1535",
    themeColor: "#0f1535",
    textColor: "white",
    image: "/slide-tools.jpg",
    imageAlt: "3D modular blocks representing integrations",
    animated: false,
    logoBg: "white",
    logoColor: "black",
    headerTextColor: "rgba(255,255,255,0.9)",
  },
  {
    id: 2,
    title: "Control spend with ease",
    bg: "#0a0a0a",
    themeColor: "#0a0a0a",
    textColor: "white",
    image: "/slide-cards.jpg",
    imageAlt: "Cartões Uppi empilhados",
    animated: false,
    logoBg: "white",
    logoColor: "black",
    headerTextColor: "rgba(255,255,255,0.9)",
  },
  {
    id: 3,
    title: "Manage and transfer 30+ currencies",
    bg: "#e8eaf6",
    themeColor: "#e8eaf6",
    textColor: "dark",
    image: "/slide-globe.jpg",
    imageAlt: "3D globe with orange orbital rings",
    animated: false,
    logoBg: "black",
    logoColor: "white",
    headerTextColor: "rgba(0,0,0,0.75)",
  },
  {
    id: 4,
    title: "Security that never sleeps",
    bg: "#080808",
    themeColor: "#080808",
    textColor: "white",
    image: "/slide-security.jpg",
    imageAlt: "Chip de segurança Uppi",
    animated: false,
    logoBg: "white",
    logoColor: "black",
    headerTextColor: "rgba(255,255,255,0.9)",
  },
]

export function OnboardingCarousel() {
  const router = useRouter()
  const [splash, setSplash] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragDeltaX = useRef(0)

  // Splash: hold 2s, then fade 0.6s
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 2000)
    const t2 = setTimeout(() => setSplash(false), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(TOTAL_SLIDES - 1, index)))
    setAnimKey((k) => k + 1)
  }, [])

  const goNext = useCallback(() => {
    setCurrent((c) => (c < TOTAL_SLIDES - 1 ? c + 1 : 0))
    setAnimKey((k) => k + 1)
  }, [])

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1))
    setAnimKey((k) => k + 1)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    const t = setTimeout(goNext, SLIDE_DURATION)
    return () => clearTimeout(t)
  }, [animKey, paused, goNext])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goNext, goPrev])

  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    dragDeltaX.current = 0
    dragging.current = true
    setPaused(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragDeltaX.current = e.clientX - dragStartX.current
  }
  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    setPaused(false)
    if (dragDeltaX.current < -50) goNext()
    else if (dragDeltaX.current > 50) goPrev()
  }

  const slide = slides[current]
  const isDark = slide.textColor === "white"

  // Atualiza theme-color da barra do sistema conforme o slide
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (meta) {
      meta.content = slide.themeColor
    } else {
      const newMeta = document.createElement("meta")
      newMeta.name = "theme-color"
      newMeta.content = slide.themeColor
      document.head.appendChild(newMeta)
    }
    // Também atualiza o background do html/body para a barra de navegação inferior
    document.documentElement.style.backgroundColor = slide.themeColor
    document.body.style.backgroundColor = slide.themeColor
  }, [slide.themeColor])

  return (
    <>
      <style>{`
        @keyframes scaleX-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* Full-screen wrapper — fills 100dvh on mobile, phone frame on desktop */}
      <div
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: slide.bg, transition: "background-color 0.5s ease" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Starburst bg — slide 0 only */}
        {slide.animated && (
          <div className="absolute inset-0 z-0">
            <StarBurst />
          </div>
        )}

        {/* Splash overlay */}
        {splash && (
          <div
            className="absolute inset-0 z-50 bg-black flex items-center justify-center"
            style={{
              opacity: splashFading ? 0 : 1,
              transition: "opacity 0.6s ease",
              pointerEvents: splashFading ? "none" : "auto",
            }}
          >
            <p className="text-white text-[1.75rem] tracking-tight">
              <span className="font-bold">Uppi</span>
            </p>
            <p className="text-white/40 text-[13px] mt-2 tracking-wide">Bem-vindo</p>
          </div>
        )}

        {/* Progress bars */}
        <div className="relative z-10 flex gap-[5px] px-5 pt-4">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => goTo(i)}
              className="flex-1 h-[2px] rounded-full overflow-hidden"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }}
            >
              {i < current && (
                <div className="h-full w-full rounded-full" style={{ backgroundColor: isDark ? "white" : "#111" }} />
              )}
              {i === current && (
                <div
                  key={`bar-${animKey}`}
                  className="h-full w-full rounded-full"
                  style={{
                    transformOrigin: "left center",
                    animation: `scaleX-fill ${SLIDE_DURATION}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                    backgroundColor: isDark ? "white" : "#111",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center gap-2 px-5 pt-4 pb-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: slide.logoBg }}
          >
            <UppiLogo className="w-4 h-4" style={{ color: slide.logoColor }} />
          </div>
          <span className="text-sm font-medium tracking-wide" style={{ color: slide.headerTextColor }}>
            Uppi — Mobilidade
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 px-5 pt-3">
          <h1
            className="font-bold text-[1.85rem] leading-[1.15] text-balance"
            style={{ color: isDark ? "white" : "#111" }}
          >
            {slide.title}
          </h1>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex-1 min-h-0">
          <div className="relative w-full h-full" style={{ minHeight: 280 }}>
            <Image
              key={slide.id}
              src={slide.image}
              alt={slide.imageAlt}
              fill
              className="object-contain"
              priority
              loading="eager"
            />
          </div>
        </div>

        {/* Bottom gradient + CTAs */}
        <div className="relative z-10 px-5 pb-8 pt-0">
          {/* Gradient fade over illustration bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-52 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${slide.bg} 55%, transparent)`,
            }}
          />
          <div className="relative flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push("/auth/passenger")}
              className="w-full py-[17px] rounded-full bg-white text-black font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100 shadow-md"
            >
              Criar conta
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full py-[17px] rounded-full font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                color: isDark ? "white" : "#111",
              }}
            >
              Entrar
            </button>

          </div>
        </div>

        {/* Tap zones */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={goPrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={goNext} />
      </div>
    </>
  )
}
