/** Platform superadmin checks — prefer app_metadata.role = 'superadmin'. */
export function isSuperAdminUser(user) {
  if (!user) return false;
  if (user.app_metadata?.role === 'superadmin') return true;

  const defaultAdmins = ['hemaxtth@gmail.com'];
  const envAdmins = (import.meta.env.VITE_SUPERADMIN_EMAILS || import.meta.env.VITE_SUPERADMIN_EMAIL || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const allowlist = [...new Set([...defaultAdmins, ...envAdmins])];

  return !!(user.email && allowlist.includes(user.email.toLowerCase()));
}

