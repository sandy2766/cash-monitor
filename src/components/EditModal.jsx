import { useState } from 'react'
import { useEditTransaction } from '../hooks/useTransactions'

function now(d) {
  const date = new Date(d)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function EditModal({ txn, onClose }) {
  const [amount, setAmount] = useState(txn.amount)
  const [datetime, setDatetime] = useState(now(txn.transacted_at))
  const [notes, setNotes] = useState(txn.notes || '')
  const [error, setError] = useState('')
  const editTxn = useEditTransaction()

  async function handleSave() {
    try {
      await editTxn.mutateAsync({ id: txn.id, updates: {
        amount: parseFloat(amount),
        transacted_at: new Date(datetime).toISOString(),
        notes: notes || null
      }})
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <h2 className="text-base font-semibold">Edit entry</h2>
        <p className="text-xs text-gray-400">Changes are logged automatically.</p>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Amount (₹)</label>
          <input type="number" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Date & Time</label>
          <input type="datetime-local" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
            value={datetime} onChange={e => setDatetime(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
          <textarea rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={editTxn.isPending}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
            {editTxn.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
