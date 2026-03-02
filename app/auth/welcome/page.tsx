import { redirect } from 'next/navigation'

// /auth/welcome -> /onboarding/splash (fluxo de auth)
// Usado por: request-ride, payments, profile, notifications quando usuario nao autenticado
export default function AuthWelcomeRedirect() {
  redirect('/onboarding')
}
