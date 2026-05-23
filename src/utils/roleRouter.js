// After login, fetch the user's roles and redirect to the right page
export async function getRoles(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (error) throw error
  return data.map(r => r.role)
}

// Returns the default landing page for a user based on their roles
// Priority: admin > holder > collector > billing
export function getHomePage(roles) {
  if (roles.includes('admin'))     return '/admin'
  if (roles.includes('holder'))    return '/holder'
  if (roles.includes('collector')) return '/collector'
  if (roles.includes('billing'))   return '/billing'
  return '/login'
}
