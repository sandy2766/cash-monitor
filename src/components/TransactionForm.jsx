import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSubmitTransaction, useNameSuggestions } from '../hooks/useTransactions'

function now() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function TransactionForm({ currentUser, onSuccess }) {
  const [fromText, setFromText] = useState('')
  const [toText, setToText]     = useState('')
  const [fromPicked, setFromPicked] = useState(null)  // { type, id, label } or null
  const [toPicked, setToPicked]     = useState(null)
  const [tag, setTag]     = useState('cash')
  const [amount, setAmount]   = useState('')
  const [datetime, setDatetime] = useState(now())
  const [notes, setNotes]     = useState('')
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen]   = useState(false)
  const [error, setError]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: suggestions } = useNameSuggestions()

  // ── Resolve what FROM and TO actually are ──────────────────
  function resolveFrom() {
    const text = (fromPicked?.label || fromText).trim()
    if (!text) return null
    if (fromPicked) return fromPicked

    // Check known users
    const me = currentUser
    if (me && text.toLowerCase() === me.name?.toLowerCase())
      return { type: 'me', id: me.id, label: text }

    const matchUser = suggestions?.users?.find(u => u.name.toLowerCase() === text.toLowerCase())
    if (matchUser) return { type: 'user', id: matchUser.id, label: text }

    const matchClient = suggestions?.clients?.find(c => c.name.toLowerCase() === text.toLowerCase())
    if (matchClient) return { type: 'client', id: matchClient.id, label: text }

    // New client — will be created on submit
    return { type: 'new_client', id: null, label: text }
  }

  function resolveTo() {
    const text = (toPicked?.label || toText).trim()
    if (!text) return null
    if (toPicked) return toPicked

    const me = currentUser
    if (me && text.toLowerCase() === me.name?.toLowerCase())
      return { type: 'me', id: me.id, label: text }

    const matchUser = suggestions?.users?.find(u => u.name.toLowerCase() === text.toLowerCase())
    if (matchUser) return { type: 'user', id: matchUser.id, label: text }

    // External party
    return { type: 'external', id: null, label: text }
  }

  const resolvedFrom = resolveFrom()
  const resolvedTo   = resolveTo()
  const isExternalTo = resolvedTo?.type === 'external'
  const tagForced    = isExternalTo && tag === 'cash'
  const canSubmit    = resolvedFrom && resolvedTo && amount && tag && !tagForced && !submitting

  // ── Suggestions lists ──────────────────────────────────────
  function fromSuggestions() {
    if (!suggestions) return []
    const q = fromText.toLowerCase()
    const items = [
      { label: `Me (${currentUser?.name || 'Me'})`, type: 'me', id: currentUser?.id, isMe: true },
      ...(suggestions.users || [])
        .filter(u => u.id !== currentUser?.id)
        .map(u => ({ label: u.name, type: 'user', id: u.id })),
      ...(suggestions.clients || [])
        .map(c => ({ label: c.name, type: 'client', id: c.id })),
    ]
    if (!q) return items
    const filtered = items.filter(i => i.label.toLowerCase().includes(q))
    // If typed text doesn't match anything, show a "new client" hint
    if (filtered.length === 0 && q.length > 1) {
      return [{ label: fromText.trim(), type: 'new_client', id: null, isNew: true }]
    }
    return filtered
  }

  function toSuggestions() {
    if (!suggestions) return []
    const q = toText.toLowerCase()
    const items = [
      { label: `Me (${currentUser?.name || 'Me'})`, type: 'me', id: currentUser?.id, isMe: true },
      ...(suggestions.users || [])
        .filter(u => u.id !== currentUser?.id)
        .map(u => ({ label: u.name, type: 'user', id: u.id })),
      ...(suggestions.externals || [])
        .map(e => ({ label: e, type: 'external' })),
    ]
    if (!q) return items
    const filtered = items.filter(i => i.label.toLowerCase().includes(q))
    if (filtered.length === 0 && q.length > 1) {
      return [{ label: toText.trim(), type: 'external', isNew: true }]
    }
    return filtered
  }

  // ── Pick handlers ──────────────────────────────────────────
  function pickFrom(item) {
    setFromText(item.label)
    setFromPicked({ type: item.type, id: item.id || null, label: item.label })
    setFromOpen(false)
  }

  function pickTo(item) {
    setToText(item.label)
    setToPicked({ type: item.type, id: item.id || null, label: item.label })
    setToOpen(false)
    if (item.type === 'external' && tag === 'cash') setTag(null)
    if (item.type !== 'external' && !tag) setTag('cash')
  }

  function setMe() {
    const label = `Me (${currentUser?.name || 'Me'})`
    setToText(label)
    setToPicked({ type: 'me', id: currentUser?.id, label })
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setSubmitting(true)

    try {
      let fromClientId = resolvedFrom.type === 'client' ? resolvedFrom.id : null

      // Auto-create new client if needed
      if (resolvedFrom.type === 'new_client') {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({ name: resolvedFrom.label, created_by: currentUser.id })
          .select()
          .single()
        if (clientErr) throw clientErr
        fromClientId = newClient.id
      }

      const txn = {
        tag,
        amount: parseFloat(amount),
        transacted_at: new Date(datetime).toISOString(),
        logged_by: currentUser.id,
        notes: notes || null,
        from_user_id: (resolvedFrom.type === 'me' || resolvedFrom.type === 'user') ? resolvedFrom.id : null,
        from_client_id: fromClientId,
        to_user_id: (resolvedTo.type === 'me' || resolvedTo.type === 'user') ? resolvedTo.id : null,
        to_external_name: resolvedTo.type === 'external' ? resolvedTo.label : null,
      }

      await submitTxn.mutateAsync(txn)
      setFromText(''); setToText(''); setFromPicked(null); setToPicked(null)
      setTag('cash'); setAmount(''); setDatetime(now()); setNotes('')
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const submitTxn = useSubmitTransaction()

  const submitLabel = submitting ? 'Submitting...'
    : !resolvedFrom ? 'Enter a From name to continue'
    : !resolvedTo   ? 'Enter a To name to continue'
    : tagForced     ? 'Select Conversion or Expense to continue'
    : 'Submit Entry'

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">

      {/* FROM */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">From</label>
        <input
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="Client or person name..."
          value={fromText}
          onChange={e => { setFromText(e.target.value); setFromPicked(null); setFromOpen(true) }}
          onFocus={() => setFromOpen(true)}
          onBlur={() => setTimeout(() => setFromOpen(false), 150)}
        />
        {fromOpen && fromSuggestions().length > 0 && (
          <div className="absolute z-20 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 overflow-hidden">
            {fromSuggestions().map((item, i) => (
              <button key={i} type="button" onMouseDown={() => pickFrom(item)}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                {item.isMe && <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Me</span>}
                {item.isNew && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">New client</span>}
                <span>{item.label}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {item.type === 'client' ? 'Client' : item.type === 'user' ? 'Team' : ''}
                </span>
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
              value={toText}
              onChange={e => { setToText(e.target.value); setToPicked(null); setToOpen(true) }}
              onFocus={() => setToOpen(true)}
              onBlur={() => setTimeout(() => setToOpen(false), 150)}
            />
            {toOpen && toSuggestions().length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 overflow-hidden">
                {toSuggestions().map((item, i) => (
                  <button key={i} type="button" onMouseDown={() => pickTo(item)}
                    className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                    {item.isMe && <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Me</span>}
                    {item.isNew && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">External</span>}
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {item.type === 'external' && !item.isNew ? 'External' : item.type === 'user' ? 'Team' : ''}
                    </span>
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
        {resolvedTo?.type === 'me' && (
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
        <input type="number" min="1" step="any"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      {/* DATE */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Date & Time</label>
        <input type="datetime-local"
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
        {submitLabel}
      </button>
    </form>
  )
}
