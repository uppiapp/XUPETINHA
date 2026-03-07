export function AppBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base black */}
      <div className="absolute inset-0" style={{ background: "#000000" }} />
      {/* Glow principal — luz azul profunda vindo de baixo-centro */}
      <div
        className="absolute"
        style={{
          width: "140%",
          height: "70%",
          bottom: "-10%",
          left: "-20%",
          background:
            "radial-gradient(ellipse at 40% 80%, #0d2d52 0%, #061525 40%, transparent 70%)",
          opacity: 0.55,
        }}
      />
      {/* Glow secundário — toque ainda mais azul no canto inferior esquerdo */}
      <div
        className="absolute"
        style={{
          width: "80%",
          height: "50%",
          bottom: 0,
          left: "-10%",
          background:
            "radial-gradient(ellipse at 20% 100%, #0a3060 0%, transparent 65%)",
          opacity: 0.35,
        }}
      />
    </div>
  )
}
