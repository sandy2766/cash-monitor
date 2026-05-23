import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMyTransactions, useHolderBalances, useCollectorPending } from '../hooks/useTransactions'
import TopBar from '../components/TopBar'
import NavTabs from '../components/NavTabs'
import TransactionForm from '../components/TransactionForm'
import EntryCard from '../components/EntryCard'
import { formatAmount } from '../components/AmountBadge'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'new', label: 'New Entry' },
  { key: 'entries', label: 'My Entries' },
]

export default function Holder() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [success, setSuccess] = useState(false)
  const { data: transactions = [], isLoading } = useMyTransactions()
  const { data: balances = [] } = useHolderBalances()
  const { data: pending = [] } = useCollectorPending()

  const total = balances.reduce((s, b) => s + Number(b.balance), 0)
  const myBalance = balances.find(b => b.id === profile?.id)

  function handleSuccess() {
    setSuccess(true)
    setTab('entries')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <TopBar title="Cash Monitor" subtitle="Holder" color="bg-emerald-900" onSignOut={signOut} />
      <NavTabs tabs={TABS} active={tab} onChange={setTab} color="#064e3b" />

      {tab === 'dashboard' && (
        <div className="p-4 space-y-4">
          {/* Total */}
          <div className="bg-emerald-900 text-white rounded-2xl p-5">
            <div className="text-xs opacity-60 mb-1">Total cash in circulation</div>
            <div className="text-3xl font-semibold">{formatAmount(total)}</div>
            <div className="text-xs opacity-40 mt-1">Across all holders · live</div>
          </div>

          {/* Holder positions */}
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Holder positions</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {balances.map(b => (
                <div key={b.id} className={`flex justify-between items-center px-4 py-3 ${b.id === profile?.id ? 'bg-emerald-50' : ''}`}>
                  <div>
                    <div className={`text-sm font-medium ${b.id === profile?.id ? 'text-emerald-800' : 'text-gray-800'}`}>
                      {b.name} {b.id === profile?.id && <span className="text-xs text-emerald-600">(you)</span>}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{formatAmount(b.balance)}</div>
                </div>
              ))}
              {balances.length === 0 && <div className="px-4 py-6 text-sm text-gray-400 text-center">No holders yet</div>}
            </div>
          </div>

          {/* Collector pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pending handover</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {pending.filter(p => p.pending_amount > 0).map(p => (
                  <div key={p.id} className="flex justify-between items-center px-4 py-3">
                    <div className="text-sm text-gray-700">{p.name}</div>
                    <div className="text-sm font-semibold text-amber-700">{formatAmount(p.pending_amount)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 px-1">Not included in circulation total</p>
            </div>
          )}
        </div>
      )}

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
