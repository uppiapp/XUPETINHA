import { redirect } from 'next/navigation'

// /auth/login -> /login
export default function AuthLoginRedirect() {
  redirect('/login')
}
