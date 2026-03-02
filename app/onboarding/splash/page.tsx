import { redirect } from 'next/navigation'

// /onboarding/splash -> /login  (pagina de entrada do fluxo de auth)
export default function OnboardingSplashRedirect() {
  redirect('/login')
}
