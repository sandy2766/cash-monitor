import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAllTransactions, useHolderBalances, useCollectorPending, useEditRequests, useProfiles } from '../hooks/useTransactions'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import NavTabs from './NavTabs'
import EntryCard from './EntryCard'
import { formatAmount } from './AmountBadge'

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'entries', label: 'All Entries' },
  { key: 'requests', label: 'Requests' },
  { key: 'users', label: 'Users' },
]

const ROLE_COLORS = {
  admin:     'bg-gray-900 text-white',
  holder:    'bg-emerald-100 text-emerald-800',
  collector: 'bg-blue-100 text-blue-800',
  billing:   'bg-violet-100 text-violet-800',
}

const ALL_ROLES = ['admin', 'holder', 'collector', 'billing']

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Add User Modal ────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roles: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleRole(role) {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role]
    }))
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required')
      return
    }
    if (form.roles.length === 0) {
      setError('Select at least one role')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create_user', ...form }
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      onSuccess()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold">Add User</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>}
        <div className="space-y-3">
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
            placeholder="Full name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
            placeholder="Email (e.g. nagaraj@cm.app)"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <input
            type="password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          <div>
            <div className="text-xs text-gray-400 mb-2">Assign roles</div>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.roles.includes(role)
                      ? ROLE_COLORS[role] + ' border-transparent'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────
function EditUserModal({ user, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [roles, setRoles] = useState(user.user_roles?.map(r => r.role) || [])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const qc = useQueryClient()

  function toggleRole(role) {
    setRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])
  }

  async function saveRoles() {
    setRolesLoading(true)
    setError('')
    try {
      await supabase.from('user_roles').delete().eq('user_id', user.id)
      if (roles.length > 0) {
        const { error: insertErr } = await supabase
          .from('user_roles')
          .insert(roles.map(r => ({ user_id: user.id, role: r })))
        if (insertErr) throw insertErr
      }
      await qc.invalidateQueries(['profiles'])
      setSuccess('Roles updated')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setRolesLoading(false)
    }
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setPwLoading(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_password', user_id: user.id, password: newPassword }
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setNewPassword('')
      setSuccess('Password updated')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setPwLoading(false)
    }
  }

  async function toggleActive() {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    await qc.invalidateQueries(['profiles'])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold">{user.name}</h2>
            <div className="text-xs text-gray-400 mt-0.5">{user.is_active ? 'Active' : 'Inactive'}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-xl">✓ {success}</div>}

        {/* Roles */}
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Roles</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_ROLES.map(role => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  roles.includes(role)
                    ? ROLE_COLORS[role] + ' border-transparent'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <button
            onClick={saveRoles}
            disabled={rolesLoading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {rolesLoading ? 'Saving...' : 'Save Roles'}
          </button>
        </div>

        {/* Password */}
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Change Password</div>
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <button
              onClick={changePassword}
              disabled={pwLoading}
              className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {pwLoading ? '...' : 'Set'}
            </button>
          </div>
        </div>

        {/* Activate / Deactivate */}
        <button
          onClick={toggleActive}
          className={`w-full py-2.5 rounded-xl text-sm font-medium border ${
            user.is_active
              ? 'border-red-200 text-red-600 bg-red-50'
              : 'border-emerald-200 text-emerald-700 bg-emerald-50'
          }`}
        >
          {user.is_active ? 'Deactivate User' : 'Activate User'}
        </button>
      </div>
    </div>
  )
}

// ── Main AdminContent ─────────────────────────────────────────
export default function AdminContent() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('overview')
  const [tagFilter, setTagFilter] = useState('all')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const { data: transactions = [], isLoading: txnLoading } = useAllTransactions()
  const { data: balances = [] } = useHolderBalances()
  const { data: pending = [] } = useCollectorPending()
  const { data: requests = [] } = useEditRequests()
  const { data: users = [] } = useProfiles()
  const qc = useQueryClient()

  const total = balances.reduce((s, b) => s + Number(b.balance), 0)
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const filteredTxns = tagFilter === 'all' ? transactions : transactions.filter(t => t.tag === tagFilter)

  const approveRequest = useMutation({
    mutationFn: async ({ req, approve }) => {
      if (approve && req.field_name !== 'DELETE') {
        const fieldMap = { 'Amount': 'amount', 'Date & Time': 'transacted_at', 'Notes': 'notes', 'Tag': 'tag' }
        const field = fieldMap[req.field_name]
        if (field) {
          const val = field === 'amount' ? parseFloat(req.requested_value) : req.requested_value
          await supabase.from('transactions').update({ [field]: val }).eq('id', req.transaction_id)
        }
      }
      if (approve && req.field_name === 'DELETE') {
        await supabase.from('transactions').update({ is_voided: true, void_reason: req.reason }).eq('id', req.transaction_id)
      }
      await supabase.from('edit_requests').update({
        status: approve ? 'approved' : 'rejected',
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', req.id)
    },
    onSuccess: () => qc.invalidateQueries()
  })

  const adminTabs = ADMIN_TABS.map(t =>
    t.key === 'requests' && pendingRequests.length > 0
      ? { ...t, label: `Requests (${pendingRequests.length})` }
      : t
  )

  return (
    <div className="border-t-4 border-gray-900">
      <div className="bg-gray-950 px-4 py-2">
        <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Admin Panel</span>
      </div>
      <NavTabs tabs={adminTabs} active={tab} onChange={setTab} color="#030712" />

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="p-4 space-y-4">
          <div className="bg-gray-950 text-white rounded-2xl p-5">
            <div className="text-xs opacity-50 mb-1">Total cash in circulation</div>
            <div className="text-3xl font-semibold">{formatAmount(total)}</div>
            <div className="text-xs opacity-30 mt-1">Across all holders</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="text-xs text-gray-400 mb-1">With collectors</div>
              <div className="text-lg font-semibold text-amber-700">
                {formatAmount(pending.reduce((s, p) => s + Number(p.pending_amount), 0))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="text-xs text-gray-400 mb-1">Pending requests</div>
              <div className="text-lg font-semibold text-red-700">{pendingRequests.length}</div>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Holder positions</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {balances.map(b => (
                <div key={b.id} className="flex justify-between items-center px-4 py-3">
                  <div className="text-sm text-gray-800">{b.name}</div>
                  <div className="text-sm font-semibold">{formatAmount(b.balance)}</div>
                </div>
              ))}
            </div>
          </div>
          {pending.filter(p => p.pending_amount > 0).length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Collector pending</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {pending.filter(p => p.pending_amount > 0).map(p => (
                  <div key={p.id} className="flex justify-between items-center px-4 py-3">
                    <div className="text-sm text-gray-800">{p.name}</div>
                    <div className="text-sm font-semibold text-amber-700">{formatAmount(p.pending_amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALL ENTRIES */}
      {tab === 'entries' && (
        <div className="p-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'cash', 'conversion', 'expense'].map(f => (
              <button key={f} onClick={() => setTagFilter(f)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tagFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {txnLoading && <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>}
          {filteredTxns.map(txn => (
            <EntryCard key={txn.id} txn={txn} currentUserId={profile?.id} canEdit={false} />
          ))}
          {!txnLoading && filteredTxns.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No entries found</div>
          )}
        </div>
      )}

      {/* REQUESTS */}
      {tab === 'requests' && (
        <div className="p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-500">{pendingRequests.length} pending</h2>
          {pendingRequests.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm">No pending requests</div>
            </div>
          )}
          {pendingRequests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">{req.requested_by_profile?.name}</div>
                  <div className="text-xs text-gray-400">{formatDate(req.created_at)}</div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Change</span>
                  <span>{req.field_name} → {req.requested_value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current</span>
                  <span>{req.current_value}</span>
                </div>
                <div className="text-gray-500 mt-1">"{req.reason}"</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveRequest.mutate({ req, approve: false })}
                  className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-sm">Reject</button>
                <button onClick={() => approveRequest.mutate({ req, approve: true })}
                  className="flex-1 py-2 rounded-xl bg-emerald-700 text-white text-sm font-medium">Approve</button>
              </div>
            </div>
          ))}
          {requests.filter(r => r.status !== 'pending').length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 mt-4 mb-2">Resolved</h2>
              {requests.filter(r => r.status !== 'pending').map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
                  <div className="flex justify-between">
                    <div className="text-sm">{req.requested_by_profile?.name} · {req.field_name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500">{users.length} team members</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl"
            >
              + Add User
            </button>
          </div>
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className="text-sm font-medium text-gray-800">{u.name}</span>
                  {!u.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                </div>
                <button
                  onClick={() => setEditUser(u)}
                  className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(u.user_roles || []).map(r => (
                  <span key={r.role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r.role] || 'bg-gray-100 text-gray-600'}`}>
                    {r.role}
                  </span>
                ))}
                {(u.user_roles || []).length === 0 && <span className="text-xs text-gray-400">No roles assigned</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false)
            qc.invalidateQueries(['profiles'])
          }}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  )
}
