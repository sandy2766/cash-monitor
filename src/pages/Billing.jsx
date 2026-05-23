import { useAuth } from '../hooks/useAuth'
import TopBar from '../components/TopBar'
import BillingContent from '../components/BillingContent'

export default function Billing() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <TopBar title="Cash Monitor" subtitle="Billing" color="bg-violet-900" onSignOut={signOut} />
      <BillingContent />
    </div>
  )
}
