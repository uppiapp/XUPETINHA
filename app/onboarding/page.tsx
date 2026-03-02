import { redirect } from 'next/navigation'

// /onboarding -> /login
export default function OnboardingRedirect() {
  redirect('/login')
}
