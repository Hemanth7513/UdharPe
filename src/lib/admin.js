/**
 * Platform superadmin verification.
 * Relies strictly on cryptographic app_metadata.role assigned via Supabase Auth.
 * Client-side user_metadata or hardcoded emails are explicitly rejected.
 */
export function isSuperAdminUser(user) {
  if (!user) return false;
  return user.app_metadata?.role === 'superadmin';
}

