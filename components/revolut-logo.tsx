import type { CSSProperties } from "react"
import Image from "next/image"

export function UppiLogo({ className = "", style, size = 32 }: { className?: string; style?: CSSProperties; size?: number }) {
  return (
    <Image
      src="/images/uppi-logo.png"
      alt="Uppi"
      width={size}
      height={size}
      className={className}
      style={style}
      priority
    />
  )
}
