import type { CSSProperties } from "react"
import Image from "next/image"

export function UppiLogo({ className = "", style, size = 32 }: { className?: string; style?: CSSProperties; size?: number }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
    >
      <Image
        src="/images/uppi-logo.png"
        alt="Uppi"
        fill
        sizes={`${size}px`}
        style={{
          objectFit: "contain",
        }}
        priority
      />
    </div>
  )
}
