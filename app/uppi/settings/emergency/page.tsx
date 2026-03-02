import { redirect } from 'next/navigation'

// /uppi/settings/emergency -> /uppi/emergency-contacts
export default function SettingsEmergencyRedirect() {
  redirect('/uppi/emergency-contacts')
}
