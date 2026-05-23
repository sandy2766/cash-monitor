import { useState } from 'react'
import { useVoidTransaction, useRequestEdit } from '../hooks/useTransactions'

export default function DeleteModal({ txn, editable, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const voidTxn = useVoidTransaction()
  const requestEdit = useRequestEdit()

  async function handleConfirm() {
    if (!reason.trim()) { setError('Reason is required'); return }
    try {
      if (editable) {
        await voidTxn.mutateAsync({ id: txn.id, reason })
      } else {
        await requestEdit.mutateAsync({
          transaction_id: txn.id,
          requested_by: txn.logged_by,
          field_name: 'DELETE',
          current_value: String(txn.amount),
          requested_value: 'VOID',
          reason
        })
      }
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-red-700">{editable ? 'Delete entry?' : 'Request deletion?'}</h2>
        <p className="text-xs text-gray-400">{editable ? 'This entry will be voided and removed from all balances.' : 'This entry is older than 48h. A deletion request will be sent for admin review.'}</p>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Reason (required)</label>
          <textarea rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none resize-none"
            placeholder="Why is this being deleted?" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        {error && <div className="text-red-600 text-sm bg-red-50 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm">Cancel</button>
          <button onClick={handleConfirm} disabled={voidTxn.isPending || requestEdit.isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-medium disabled:opacity-50">
            {editable ? 'Yes, delete' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}
