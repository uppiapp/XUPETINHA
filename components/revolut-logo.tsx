import type { CSSProperties } from "react"

export function RevolutLogo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-label="Uppi"
      role="img"
    >
      <path d="M17.073 0H3v24h5.303v-8.648h2.9l4.687 8.648H21.6l-5.21-9.26C18.75 13.562 21 11.21 21 7.616 21 3.056 19.437 0 17.073 0zM8.303 4.56h8.12c.738 0 1.277 1.22 1.277 3.056 0 1.836-.539 3.056-1.277 3.056H8.303V4.56z" />
    </svg>
  )
}
