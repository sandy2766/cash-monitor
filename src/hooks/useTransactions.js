import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useMyTransactions() {
  return useQuery({
    queryKey: ['my-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_user:from_user_id(id, name),
          from_client:from_client_id(id, name),
          to_user:to_user_id(id, name)
        `)
        .eq('is_voided', false)
        .order('transacted_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ['all-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          from_user:from_user_id(id, name),
          from_client:from_client_id(id, name),
          to_user:to_user_id(id, name)
        `)
        .order('transacted_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useHolderBalances() {
  return useQuery({
    queryKey: ['holder-balances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holder_balances').select('*')
      if (error) throw error
      return data
    },
    refetchInterval: 30000
  })
}

export function useCollectorPending() {
  return useQuery({
    queryKey: ['collector-pending'],
    queryFn: async () => {
      const { data, error } = await supabase.from('collector_pending').select('*')
      if (error) throw error
      return data
    },
    refetchInterval: 30000
  })
}

export function useClientCollections() {
  return useQuery({
    queryKey: ['client-collections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_collections').select('*')
      if (error) throw error
      return data
    }
  })
}

export function useSubmitTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (txn) => {
      const { data, error } = await supabase.from('transactions').insert([txn]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-transactions'] })
      qc.invalidateQueries({ queryKey: ['all-transactions'] })
      qc.invalidateQueries({ queryKey: ['holder-balances'] })
      qc.invalidateQueries({ queryKey: ['collector-pending'] })
      qc.invalidateQueries({ queryKey: ['client-collections'] })
    }
  })
}

export function useVoidTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_voided: true, void_reason: reason, voided_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
}

export function useEditTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase.from('transactions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries()
    }
  })
}

export function useRequestEdit() {
  return useMutation({
    mutationFn: async (request) => {
      const { error } = await supabase.from('edit_requests').insert([request])
      if (error) throw error
    }
  })
}

export function useEditRequests() {
  return useQuery({
    queryKey: ['edit-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edit_requests')
        .select(`*, requested_by_profile:requested_by(name), transaction:transaction_id(*)`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
      if (error) throw error
      return data
    }
  })
}

export function useNameSuggestions() {
  return useQuery({
    queryKey: ['name-suggestions'],
    queryFn: async () => {
      const [{ data: users }, { data: clients }, { data: externals }] = await Promise.all([
        supabase.from('profiles').select('id, name').eq('is_active', true),
        supabase.from('clients').select('id, name').eq('is_active', true),
        supabase.from('transactions').select('to_external_name').not('to_external_name', 'is', null)
      ])
      const externalNames = [...new Set((externals || []).map(e => e.to_external_name))]
      return {
        users: users || [],
        clients: clients || [],
        externals: externalNames
      }
    }
  })
}
