import { useState } from 'react'
import { useClientCollections } from '../hooks/useTransactions'
import NavTabs from './NavTabs'
import { formatAmount } from './AmountBadge'

const TABS = [
  { key: 'ledger', label: 'Client Ledger' },
  { key: 'summary', label: 'Summary' },
]

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BillingContent() {
  const [tab, setTab] = useState('ledger')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const { data: collections = [], isLoading } = useClientCollections()

  const grouped = collections.reduce((acc, txn) => {
    const key = txn.client_id
    if (!acc[key]) acc[key] = { client_name: txn.client_name, client_phone: txn.client_phone, entries: [] }
    acc[key].entries.push(txn)
    return acc
  }, {})

  const clients = Object.entries(grouped)
    .map(([id, data]) => ({
      id,
      ...data,
      total: data.entries.reduce((s, e) => s + Number(e.amount), 0),
      lastDate: data.entries[0]?.transacted_at,
    }))
    .filter(c => c.client_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))

  const grandTotal = collections.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <NavTabs tabs={TABS} active={tab} onChange={setTab} color="#4c1d95" />

      {tab === 'ledger' && (
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-700"
              placeholder="Search client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="text-xs text-gray-400 mb-1">Total collected</div>
              <div className="text-lg font-semibold text-violet-800">{formatAmount(grandTotal)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="text-xs text-gray-400 mb-1">Active clients</div>
              <div className="text-lg font-semibold">{clients.length}</div>
            </div>
          </div>

          {isLoading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}

          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                onClick={() => setExpanded(expanded === client.id ? null : client.id)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {client.client_phone && `${client.client_phone} · `}{client.entries.length} payments
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-semibold text-violet-800">{formatAmount(client.total)}</div>
                  <div className="text-xs text-gray-400">Last: {formatDate(client.lastDate)}</div>
                </div>
              </button>
              {expanded === client.id && (
                <div className="border-t border-gray-50 bg-gray-50 divide-y divide-gray-100">
                  {client.entries.map(e => (
                    <div key={e.id} className="px-4 py-2.5 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium text-gray-800">{formatAmount(e.amount)}</div>
                        <div className="text-xs text-gray-400">by {e.collected_by}</div>
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(e.transacted_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!isLoading && clients.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">🗂</div>
              <div className="text-sm">No client payments yet</div>
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-xs text-gray-400 mb-1">Total collected from clients</div>
            <div className="text-3xl font-semibold text-violet-900">{formatAmount(grandTotal)}</div>
          </div>
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Top clients</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span>Client</span><span className="text-center">Payments</span><span className="text-right">Total</span>
              </div>
              {[...clients].sort((a, b) => b.total - a.total).slice(0, 10).map(c => (
                <div key={c.id} className="grid grid-cols-3 px-4 py-3 border-t border-gray-50 text-sm items-center">
                  <span className="text-gray-800 truncate pr-2">{c.client_name}</span>
                  <span className="text-center text-gray-500">{c.entries.length}</span>
                  <span className="text-right font-medium">{formatAmount(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
