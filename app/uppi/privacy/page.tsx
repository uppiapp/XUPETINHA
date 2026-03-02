import { redirect } from 'next/navigation'

// /uppi/privacy -> /uppi/legal/privacy
export default function PrivacyRedirect() {
  redirect('/uppi/legal/privacy')
}
