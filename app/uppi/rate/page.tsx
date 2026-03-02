import { redirect } from 'next/navigation'

// /uppi/rate?rideId=xxx -> /uppi/history  (fallback, o rideId nao e passivel de redirecionar dinamicamente aqui)
// A rota correta esta em /uppi/ride/[id]/review — corrigida no tracking/page.tsx
export default function RateRedirect() {
  redirect('/uppi/history')
}
