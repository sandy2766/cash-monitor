import { useState } from 'react'
import { useRequestEdit } from '../hooks/useTransactions'

const FIELDS = ['Amount', 'Date & Time', 'Notes', 'Tag']

export default function RequestEditModal({ txn, onClose }) {
  const [field, setField] = useState('Amount')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const requestEdit = useRequestEdit()

  async function handleSend() {
    if (!value.trim() || !reason.trim()) { setError('All fields are required'); return }
    try {
      await requestEdit.mutateAsync({
        transaction_id: txn.id,
        requested_by: txn.logged_by,
        field_name: field,
        current_value: String(txn[field.toLowerCase().replace(' & ', '_')] || ''),
        requested_value: value,
        reason
      })
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        {sent ? (
          <>
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-green-700">Request submitted</div>
              <div className="text-xs text-gray-400 mt-1">Your edit request has been sent for review.</div>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm">Close</button>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <h2 className="text-base font-semibold">Request edit</h2>
              <p className="text-xs text-gray-400">Entry is older than 48h. Request will be reviewed.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">What needs to change?</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none"
                value={field} onChange={e => setField(e.target.value)}>
                {FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Correct value</label>
              <input className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none"
                placeholder="Enter the correct value" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Reason</label>
              <textarea rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
                placeholder="Why does this need to change?" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3.5 py-2.5">{error}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm">Cancel</button>
              <button onClick={handleSend} disabled={requestEdit.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-medium disabled:opacity-50">
                {requestEdit.isPending ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
