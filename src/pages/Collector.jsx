import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMyTransactions, useCollectorPending } from '../hooks/useTransactions'
import TopBar from '../components/TopBar'
import NavTabs from '../components/NavTabs'
import TransactionForm from '../components/TransactionForm'
import EntryCard from '../components/EntryCard'
import { formatAmount } from '../components/AmountBadge'

const TABS = [
  { key: 'new', label: 'New Entry' },
  { key: 'entries', label: 'My Entries' },
]

export default function Collector() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('new')
  const [success, setSuccess] = useState(false)
  const { data: transactions = [], isLoading } = useMyTransactions()
  const { data: pending = [] } = useCollectorPending()

  const myPending = pending.find(p => p.id === profile?.id)

  function handleSuccess() {
    setSuccess(true)
    setTab('entries')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <TopBar title="Cash Monitor" subtitle="Collector" color="bg-gray-900" onSignOut={signOut} />
      <NavTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'new' && (
        <div>
          {success && (
            <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              ✅ Entry submitted successfully
            </div>
          )}
          <TransactionForm currentUser={profile} onSuccess={handleSuccess} />
        </div>
      )}

      {tab === 'entries' && (
        <div className="p-4 space-y-3">
          {myPending && myPending.pending_amount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-amber-700 font-medium">With me (pending handover)</div>
                <div className="text-xl font-semibold text-amber-900 mt-0.5">{formatAmount(myPending.pending_amount)}</div>
              </div>
              <span className="text-2xl">💼</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">My Entries</h2>
            <span className="text-xs text-gray-400">{transactions.length} total</span>
          </div>

          {isLoading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}

          {!isLoading && transactions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm">No entries yet</div>
            </div>
          )}

          {transactions.map(txn => (
            <EntryCard key={txn.id} txn={txn} currentUserId={profile?.id} canEdit />
          ))}

          <div className="text-center text-xs text-gray-400 py-4">
            🔒 Entries older than 48h require admin approval to edit
          </div>
        </div>
      )}
    </div>
  )
}
