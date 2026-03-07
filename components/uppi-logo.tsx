import Image from 'next/image'

export function UppiLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/images/uppi-logo.png"
        alt="Uppi"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}

export function UppiWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <UppiLogo size={44} />
      <span className="text-[32px] font-bold tracking-[-0.8px] bg-gradient-to-r from-[#3AAFFF] to-[#FF8C00] bg-clip-text text-transparent">
        Uppi
      </span>
    </div>
  )
}
