import { redirect } from 'next/navigation'

// /onboarding/create-account -> /login
export default function OnboardingCreateAccountRedirect() {
  redirect('/login')
}
