"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Gauge } from "lucide-react"
import { UppiLogo } from "@/components/revolut-logo"

const OPTIONS = [
  {
    id: "passenger",
    label: "Passageiro",
    description: "Solicite corridas com conforto e segurança",
    icon: MapPin,
    accentColor: "#007AFF",
    bgColor: "rgba(0,122,255,0.08)",
    borderColor: "rgba(0,122,255,0.5)",
    redirectTo: "/auth/passenger",
  },
  {
    id: "driver",
    label: "Motorista",
    description: "Ganhe dinheiro dirigindo no seu próprio tempo",
    icon: Gauge,
    accentColor: "#34C759",
    bgColor: "rgba(52,199,89,0.08)",
    borderColor: "rgba(52,199,89,0.5)",
    redirectTo: "/auth/driver/welcome",
  },
]

export default function SelectionPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const handleContinue = () => {
    const option = OPTIONS.find((o) => o.id === selected)
    if (option) router.push(option.redirectTo)
  }

  const selectedOption = OPTIONS.find((o) => o.id === selected)

  return (
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-6 pb-2">
        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
          <UppiLogo className="w-4 h-4 text-black" />
        </div>
        <span className="text-sm font-medium text-white/70 tracking-wide">Uppi</span>
      </div>

      {/* Title */}
      <div className="px-5 pt-8 pb-6">
        <h1 className="text-[32px] font-bold text-white leading-tight text-balance">
          Como você quer usar o Uppi?
        </h1>
        <p className="text-[15px] text-white/50 mt-2">Selecione uma opção para continuar</p>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center px-5 gap-4">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.id

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              whileTap={{ scale: 0.97 }}
              className="w-full text-left rounded-[24px] p-5 border transition-colors duration-200"
              style={{
                backgroundColor: isSelected ? option.bgColor : "rgba(255,255,255,0.04)",
                borderColor: isSelected ? option.borderColor : "rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? option.bgColor : "rgba(255,255,255,0.07)",
                    border: `1.5px solid ${isSelected ? option.borderColor : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: isSelected ? option.accentColor : "rgba(255,255,255,0.5)" }}
                    strokeWidth={2}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[17px] font-semibold"
                    style={{ color: isSelected ? option.accentColor : "white" }}
                  >
                    {option.label}
                  </p>
                  <p className="text-[13px] text-white/40 mt-0.5 leading-snug">
                    {option.description}
                  </p>
                </div>

                {/* Check */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: option.accentColor }}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-6">
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          whileTap={{ scale: 0.97 }}
          className="w-full py-[17px] rounded-full font-semibold text-[16px] transition-all duration-300"
          animate={{
            backgroundColor: selected ? (selectedOption?.accentColor ?? "#fff") : "rgba(255,255,255,0.12)",
            color: selected ? "#fff" : "rgba(255,255,255,0.3)",
          }}
        >
          Continuar
        </motion.button>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 w-full py-3 text-[14px] text-white/30 font-medium"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
