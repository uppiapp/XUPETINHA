import { redirect } from 'next/navigation'

// /uppi/terms -> /uppi/legal/terms
export default function TermsRedirect() {
  redirect('/uppi/legal/terms')
}
