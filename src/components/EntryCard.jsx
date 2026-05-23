import { useState } from 'react'
import TagPill from './TagPill'
import AmountBadge, { formatAmount } from './AmountBadge'
import EditModal from './EditModal'
import DeleteModal from './DeleteModal'
import RequestEditModal from './RequestEditModal'

function isWithin48h(loggedAt) {
  return new Date() - new Date(loggedAt) < 48 * 60 * 60 * 1000
}

function fromLabel(txn) {
  if (txn.from_client?.name) return txn.from_client.name
  if (txn.from_user?.name) return txn.from_user.name
  return '—'
}
function toLabel(txn) {
  if (txn.to_user?.name) return txn.to_user.name
  if (txn.to_external_name) return txn.to_external_name
  return '—'
}
function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function EntryCard({ txn, currentUserId, canEdit = true }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showRequest, setShowRequest] = useState(false)

  const editable = isWithin48h(txn.logged_at)
  const isOwn = txn.logged_by === currentUserId

  const direction = txn.to_user_id === currentUserId ? 'in'
    : txn.from_user_id === currentUserId ? 'out'
    : null

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 ${txn.is_voided ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-800">
          <span className="font-medium">{fromLabel(txn)}</span>
          <span className="text-gray-400 mx-1.5">→</span>
          <span className="font-medium">{toLabel(txn)}</span>
        </div>
        <AmountBadge amount={txn.amount} direction={direction} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <TagPill tag={txn.tag} />
        <span className="text-xs text-gray-400">{formatDate(txn.transacted_at)}</span>
        {txn.is_voided && <span className="text-xs text-red-500 font-medium">Voided</span>}
      </div>
      {txn.notes && <p className="text-xs text-gray-400 mt-1.5 italic">{txn.notes}</p>}

      {canEdit && isOwn && !txn.is_voided && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
          {editable ? (
            <>
              <button onClick={() => setShowEdit(true)}
                className="text-xs text-blue-600 hover:underline">Edit</button>
              <span className="text-gray-200">·</span>
              <button onClick={() => setShowDelete(true)}
                className="text-xs text-red-500 hover:underline">Delete</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowRequest(true)}
                className="text-xs text-orange-600 hover:underline">🔒 Request edit</button>
              <span className="text-gray-200">·</span>
              <button onClick={() => setShowDelete(true)}
                className="text-xs text-red-400 hover:underline">🔒 Request delete</button>
            </>
          )}
        </div>
      )}

      {showEdit && <EditModal txn={txn} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteModal txn={txn} editable={editable} onClose={() => setShowDelete(false)} />}
      {showRequest && <RequestEditModal txn={txn} onClose={() => setShowRequest(false)} />}
    </div>
  )
}
