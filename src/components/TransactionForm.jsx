import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSubmitTransaction, useNameSuggestions } from '../hooks/useTransactions'

function now() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function TransactionForm({ currentUser, onSuccess }) {
  const [from, setFrom] = useState({ label: '', type: null, id: null })
  const [to, setTo]     = useState({ label: '', type: null, id: null, external: null })
  const [tag, setTag]   = useState('cash')
  const [amount, setAmount] = useState('')
  const [datetime, setDatetime] = useState(now())
  const [notes, setNotes] = useState('')
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen]     = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: suggestions } = useNameSuggestions()
  const submitTxn = useSubmitTransaction()

  const isExternalTo = to.type === 'external'
  const tagForced = isExternalTo && tag === 'cash'
  const canSubmit = from.type && to.type && amount && !tagForced && !submitting

  function meOption(user) {
    return { label: `Me (${user.name})`, type: 'me', id: user.id, isMe: true }
  }

  function fromSuggestions() {
    if (!suggestions) return []
    const q = from.label.toLowerCase()
    const items = [
      { label: `Me (${currentUser?.name || 'Me'})`, type: 'me', id: currentUser?.id, isMe: true },
      ...(suggestions.users || [])
        .filter(u => u.id !== currentUser?.id)
        .map(u => ({ label: u.name, type: 'user', id: u.id })),
      ...(suggestions.clients || [])
        .map(c => ({ label: c.name, type: 'client', id: c.id })),
    ]
    return q ? items.filter(i => i.label.toLowerCase().includes(q)) : items
  }

  function toSuggestions() {
    if (!suggestions) return []
    const q = to.label.toLowerCase()
    const items = [
      { label: `Me (${currentUser?.name || 'Me'})`, type: 'me', id: currentUser?.id, isMe: true },
      ...(suggestions.users || [])
        .filter(u => u.id !== currentUser?.id)
        .map(u => ({ label: u.name, type: 'user', id: u.id })),
      ...(suggestions.externals || [])
        .map(e => ({ label: e, type: 'external', external: e })),
    ]
    return q ? items.filter(i => i.label.toLowerCase().includes(q)) : items
  }

  function pickFrom(item) {
    setFrom({ label: item.label, type: item.type, id: item.id })
    setFromOpen(false)
  }

  function pickTo(item) {
    setTo({ label: item.label, type: item.type, id: item.id, external: item.external || null })
    setToOpen(false)
    if (item.type === 'external' && tag === 'cash') setTag(null)
    if (item.type !== 'external' && !tag) setTag('cash')
  }

  function setMe() {
    pickTo({ label: `Me (${currentUser?.name || 'Me'})`, type: 'me', id: currentUser?.id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setSubmitting(true)
    try {
      const txn = {
        tag,
        amount: parseFloat(amount),
        transacted_at: new Date(datetime).toISOString(),
        logged_by: currentUser.id,
        notes: notes || null,
        from_user_id: (from.type === 'me' || from.type === 'user') ? from.id : null,
        from_client_id: from.type === 'client' ? from.id : null,
        to_user_id: (to.type === 'me' || to.type === 'user') ? to.id : null,
        to_external_name: to.type === 'external' ? to.label : null,
      }
      await submitTxn.mutateAsync(txn)
      setFrom({ label: '', type: null, id: null })
      setTo({ label: '', type: null, id: null, external: null })
      setTag('cash')
      setAmount('')
      setDatetime(now())
      setNotes('')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {/* FROM */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">From</label>
        <input
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="Client or person..."
          value={from.label}
          onChange={e => { setFrom({ label: e.target.value, type: null, id: null }); setFromOpen(true) }}
          onFocus={() => setFromOpen(true)}
          onBlur={() => setTimeout(() => setFromOpen(false), 150)}
        />
        {fromOpen && fromSuggestions().length > 0 && (
          <div className="absolute z-20 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 overflow-hidden">
            {fromSuggestions().map((item, i) => (
              <button key={i} type="button" onMouseDown={() => pickFrom(item)}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                {item.isMe && <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Me</span>}
                <span>{item.label}</span>
                <span className="ml-auto text-xs text-gray-400">{item.type === 'client' ? 'Client' : item.type === 'user' ? 'Team' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TO */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">To</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="Holder, collector, or party..."
              value={to.label}
              onChange={e => { setTo({ label: e.target.value, type: null, id: null }); setToOpen(true) }}
              onFocus={() => setToOpen(true)}
              onBlur={() => setTimeout(() => setToOpen(false), 150)}
            />
            {toOpen && toSuggestions().length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 overflow-hidden">
                {toSuggestions().map((item, i) => (
                  <button key={i} type="button" onMouseDown={() => pickTo(item)}
                    className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                    {item.isMe && <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Me</span>}
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-gray-400">{item.type === 'external' ? 'External' : item.type === 'user' ? 'Team' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={setMe}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium bg-gray-50 hover:bg-gray-100 whitespace-nowrap">
            ME
          </button>
        </div>
        {isExternalTo && (
          <p className="text-xs text-orange-600 mt-1.5">External party — select Conversion or Expense to continue</p>
        )}
        {to.type === 'me' && (
          <p className="text-xs text-gray-400 mt-1.5">Cash stays with you (pending handover)</p>
        )}
      </div>

      {/* TAG */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Tag</label>
        <div className="flex gap-2">
          {[
            { key: 'cash', label: '💵 Cash' },
            { key: 'conversion', label: '🔄 Conversion' },
            { key: 'expense', label: '💸 Expense' },
          ].map(t => (
            <button key={t.key} type="button"
              onClick={() => setTag(t.key)}
              disabled={t.key === 'cash' && isExternalTo}
              className={`flex-1 py-2 text-sm rounded-xl border transition-all ${
                tag === t.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : t.key === 'cash' && isExternalTo
                    ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-400'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* AMOUNT */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Amount (₹)</label>
        <input type="number" min="1" step="any" required
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      {/* DATE */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Date & Time</label>
        <input type="datetime-local" required
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          value={datetime} onChange={e => setDatetime(e.target.value)} />
      </div>

      {/* NOTES */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Notes <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none text-gray-500"
          placeholder="Any additional context..."
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3.5 py-2.5">{error}</div>}

      <button type="submit" disabled={!canSubmit}
        className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors">
        {submitting ? 'Submitting...' : !from.type || !to.type ? 'Fill in From and To to continue' : tagForced ? 'Select a tag to continue' : 'Submit Entry'}
      </button>
    </form>
  )
}
