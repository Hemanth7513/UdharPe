import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { Settings as SettingsIcon, LogOut, User, Mail, Briefcase, Edit2, Save, X, ShieldCheck, Globe, Calendar, Download, RotateCw, Lock, Eye, EyeOff, Activity, ShieldAlert, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import LanguageSelector from '../components/LanguageSelector';
import { getMerchantPrefs, saveMerchantPrefs } from '../lib/preferences';
import { exportCsv } from '../lib/csv';

const DUE_TERM_OPTIONS = [
  { days: 0, labelKey: 'dueDate.today' },
  { days: 7, labelKey: 'dueDate.days7' },
  { days: 15, labelKey: 'dueDate.days15' },
  { days: 30, labelKey: 'dueDate.days30' },
  { days: 45, labelKey: 'dueDate.days45' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(() => getMerchantPrefs());
  const [exporting, setExporting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [lastSignInAt, setLastSignInAt] = useState('');
  const [healthStatus, setHealthStatus] = useState({ checking: false, ok: null, latencyMs: null, totalBusinesses: null, totalCustomers: null });
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const [profile, setProfile] = useState({
    firm_name: '',
    owner_name: '',
    email: ''
  });
  
  // Backup for canceling
  const [originalProfile, setOriginalProfile] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? (navigator.onLine ? (await supabase.auth.getUser()).data?.user : null);
      if (!user) return;

      const adminFlag = isSuperAdminUser(user);
      setIsAdmin(adminFlag);
      setLastSignInAt(user.last_sign_in_at || '');

      const userProfile = {
        firm_name: user.user_metadata?.firm_name || '',
        owner_name: user.user_metadata?.owner_name || '',
        email: user.email || ''
      };
      
      setProfile(userProfile);
      setOriginalProfile(userProfile);

      if (adminFlag && navigator.onLine) {
        runAdminDiagnostics();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAdminDiagnostics = async () => {
    setHealthStatus((prev) => ({ ...prev, checking: true }));
    setLoadingEvents(true);
    const start = performance.now();
    try {
      const [statsRes, eventsRes] = await Promise.all([
        supabase.functions.invoke('admin-stats'),
        supabase.functions.invoke('admin-stats', { body: { action: 'get_security_events' } }),
      ]);
      const latencyMs = Math.round(performance.now() - start);

      if (statsRes.error || statsRes.data?.error) {
        setHealthStatus({ checking: false, ok: false, latencyMs, totalBusinesses: null, totalCustomers: null });
      } else {
        setHealthStatus({
          checking: false,
          ok: true,
          latencyMs,
          totalBusinesses: statsRes.data?.totalBusinesses ?? 0,
          totalCustomers: statsRes.data?.totalCustomers ?? 0,
        });
      }

      if (!eventsRes.error && Array.isArray(eventsRes.data?.events)) {
        setSecurityEvents(eventsRes.data.events);
      }
    } catch {
      setHealthStatus({ checking: false, ok: false, latencyMs: null, totalBusinesses: null, totalCustomers: null });
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.auth.updateUser({
        data: {
          firm_name: profile.firm_name,
          owner_name: profile.owner_name
        }
      });
      if (error) throw error;

      // Keep profiles table in sync for reminders / server-side firm name
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          firm_name: profile.firm_name || 'My Business',
          owner_name: profile.owner_name || null,
        });
      if (profileError) {
        // Fallback to update if insert policy is not yet applied on remote DB
        await supabase
          .from('profiles')
          .update({
            firm_name: profile.firm_name || 'My Business',
            owner_name: profile.owner_name || null,
          })
          .eq('id', user.id);
      }
      
      setOriginalProfile(profile);
      setIsEditing(false);
      toast.success(t('settings.savedSuccess'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleHardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch {
      // Proceed with reload even if cache cleanup is restricted
    }
    window.location.reload();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setUpdatingPassword(true);
    try {
      if (profile.email && currentPassword) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: currentPassword,
        });
        if (verifyErr) {
          throw new Error('Current password is incorrect');
        }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-zinc-700 font-display font-bold">Loading Settings...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header className="mb-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-white border border-zinc-300 flex items-center justify-center text-zinc-900">
            <SettingsIcon size={22} />
          </div>
        <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">
              {isAdmin ? t('nav.admin') + ' ' + t('settings.title') : t('settings.title')}
            </h1>
            <p className="text-zinc-600 text-[14px] mt-0.5">
              {isAdmin ? 'Platform Superadmin account & session' : t('settings.subtitle')}
            </p>
          </div>
        </div>

        {!isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-solid p-2.5"
            title="Edit Profile"
          >
            <Edit2 size={18} />
          </button>
        )}
      </header>

      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Superadmin Session & Password */}
          <div className="lg:col-span-5 space-y-5">
            <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700">Access Level</label>
                <div className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-md bg-zinc-50 border border-zinc-200 font-semibold text-zinc-900">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-700" />
                    Platform Superadmin
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Verified
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700">Email Address</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full pl-11 pr-4 py-2.5 rounded-md font-medium text-zinc-600 bg-zinc-50 border border-zinc-200"
                  />
                </div>
              </div>

              {lastSignInAt && (
                <div className="flex items-center gap-2 text-[13px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
                  <Clock size={14} className="text-zinc-500 shrink-0" />
                  <span>Last sign-in: <strong className="text-zinc-900">{new Date(lastSignInAt).toLocaleString('en-IN')}</strong></span>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-200 space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="btn-primary w-full py-2.5"
                >
                  Open Platform Command Center
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleHardRefresh}
                    className="btn-solid py-2.5 text-[13px]"
                    title={t('settings.hardRefreshDesc', 'Clear cached app files and load the latest version')}
                  >
                    <RotateCw size={15} /> {t('settings.hardRefresh', 'Hard Refresh')}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="py-2.5 px-3 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 text-red-700 font-semibold transition-colors duration-150 text-[13px]"
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              </div>
            </section>

            {/* Superadmin Change Password */}
            <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                    <Lock size={18} className="text-zinc-700" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-display font-bold text-zinc-900">
                      Change Password
                    </h2>
                    <p className="text-[13px] text-zinc-600 mt-0.5">
                      Rotate your superadmin password
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="p-2 rounded-md border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                  aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label htmlFor="adminCurrentPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                    Current Password
                  </label>
                  <input
                    id="adminCurrentPassword"
                    type={showPasswords ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="adminNewPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                    New Password
                  </label>
                  <input
                    id="adminNewPassword"
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="adminConfirmNewPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="adminConfirmNewPassword"
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="btn-primary w-full"
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </section>
          </div>

          {/* Right Column: Platform Diagnostics, Security Events & Language */}
          <div className="lg:col-span-7 space-y-5">
            <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                    <Activity size={18} className="text-zinc-700" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-display font-bold text-zinc-900">
                      Platform Health &amp; Edge Diagnostics
                    </h2>
                    <p className="text-[13px] text-zinc-600 mt-0.5">
                      Live check of Supabase Edge Functions &amp; platform counts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runAdminDiagnostics}
                  disabled={healthStatus.checking}
                  className="btn-solid px-3 py-1.5 text-[13px]"
                >
                  <RotateCw size={14} className={healthStatus.checking ? 'animate-spin' : ''} />
                  {healthStatus.checking ? 'Checking...' : 'Run Check'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200">
                  <p className="text-[12px] font-medium text-zinc-500">Edge API Status</p>
                  <p className={`text-[15px] font-display font-bold mt-0.5 ${healthStatus.ok ? 'text-emerald-700' : healthStatus.ok === false ? 'text-red-600' : 'text-zinc-700'}`}>
                    {healthStatus.ok === true ? `Healthy (${healthStatus.latencyMs}ms)` : healthStatus.ok === false ? 'Degraded / Offline' : 'Not checked'}
                  </p>
                </div>
                <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200">
                  <p className="text-[12px] font-medium text-zinc-500">Registered Businesses</p>
                  <p className="text-[15px] font-display font-bold text-zinc-900 tabular-nums mt-0.5">
                    {healthStatus.totalBusinesses ?? '—'}
                  </p>
                </div>
                <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200">
                  <p className="text-[12px] font-medium text-zinc-500">Total Customers</p>
                  <p className="text-[15px] font-display font-bold text-zinc-900 tabular-nums mt-0.5">
                    {healthStatus.totalCustomers ?? '—'}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                    <ShieldAlert size={18} className="text-zinc-700" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-display font-bold text-zinc-900">
                      Recent Security &amp; Bot Events
                    </h2>
                    <p className="text-[13px] text-zinc-600 mt-0.5">
                      Latest blocked bot signups, disposable emails &amp; rate-limit hits
                    </p>
                  </div>
                </div>
              </div>

              {loadingEvents ? (
                <p className="text-[13px] text-zinc-500 animate-pulse">Loading security events...</p>
              ) : securityEvents.length === 0 ? (
                <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200 text-[13px] text-zinc-600">
                  No suspicious bot or rate-limit events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
                  {securityEvents.map((ev) => (
                    <div key={ev.id} className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3 text-[13px]">
                      <div className="min-w-0">
                        <span className="font-semibold text-zinc-900">{ev.event_type}</span>
                        {ev.identifier && (
                          <span className="ml-2 text-zinc-500 font-mono text-[12px] truncate">{ev.identifier}</span>
                        )}
                      </div>
                      <span className="text-[12px] text-zinc-500 shrink-0 tabular-nums">
                        {new Date(ev.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                  <Globe size={18} className="text-zinc-700" />
                </div>
                <div>
                  <h2 className="text-[16px] font-display font-bold text-zinc-900">
                    {t('settings.languageSection')}
                  </h2>
                  <p className="text-[13px] text-zinc-600 mt-0.5">
                    {t('settings.languageDesc')}
                  </p>
                </div>
              </div>
              <LanguageSelector variant="grid" />
            </section>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Business Profile + Data & Backup */}
        <div className="lg:col-span-5 space-y-5">
      <form onSubmit={handleSaveProfile} className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-5">

        <div className="space-y-1.5">
          <label htmlFor="firmName" className="block text-[13px] font-semibold text-zinc-700">{t('settings.firmName')}</label>
          <div className="relative">
            <Briefcase size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="firmName"
              type="text"
              required
              disabled={!isEditing}
              placeholder={t('settings.firmNamePlaceholder')}
              value={profile.firm_name}
              onChange={(e) => setProfile({ ...profile, firm_name: e.target.value })}
              className={`w-full pl-11 pr-4 py-2.5 rounded-md font-semibold text-zinc-900 outline-none transition-colors duration-150 ${isEditing ? 'bg-white border border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10' : 'bg-zinc-50 border border-zinc-200'}`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ownerName" className="block text-[13px] font-semibold text-zinc-700">{t('settings.ownerName')}</label>
          <div className="relative">
            <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="ownerName"
              type="text"
              required
              disabled={!isEditing}
              placeholder={t('settings.ownerNamePlaceholder')}
              value={profile.owner_name}
              onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })}
              className={`w-full pl-11 pr-4 py-2.5 rounded-md font-semibold text-zinc-900 outline-none transition-colors duration-150 ${isEditing ? 'bg-white border border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10' : 'bg-zinc-50 border border-zinc-200'}`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[13px] font-semibold text-zinc-700">{t('settings.emailAddress')}</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full pl-11 pr-4 py-2.5 rounded-md font-medium text-zinc-600 bg-zinc-50 border border-zinc-200"
            />
          </div>
          {isEditing && <p className="text-[13px] text-zinc-500 mt-1">Email cannot be changed here.</p>}
        </div>

        {isEditing && (
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-solid flex-1 py-2.5"
            >
              <X size={17} /> {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 py-2.5"
            >
              <Save size={17} /> {saving ? t('settings.saving') : t('settings.saveChanges')}
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="pt-5 mt-5 border-t border-zinc-200">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 text-red-700 font-semibold transition-colors duration-150 text-[14px]"
            >
              <LogOut size={18} /> {t('settings.logoutBtn')}
            </button>
          </div>
        )}

      </form>

          {/* Data & Backup */}
          <section className="bg-white border border-zinc-300 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                <Download size={18} className="text-zinc-700" />
              </div>
              <div>
                <h2 className="text-[16px] font-display font-bold text-zinc-900">
                  {t('settings.dataBackupSection')}
                </h2>
                <p className="text-[13px] text-zinc-600 mt-0.5">
                  {t('settings.dataBackupDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  const { data, error } = await supabase
                    .from('customers')
                    .select('name, firm_name, phone, email, address, gst_details, total_outstanding')
                    .eq('business_id', user.id)
                    .order('name', { ascending: true });
                  if (error) throw error;
                  const rows = (data || []).map((c) => [
                    c.name || '',
                    c.firm_name || '',
                    c.phone || '',
                    c.email || '',
                    c.address || '',
                    c.gst_details || '',
                    Number(c.total_outstanding || 0),
                  ]);
                  exportCsv(
                    `udharpe_customers_backup_${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Name', 'Firm Name', 'Phone', 'Email', 'Address', 'GST', 'Outstanding (INR)'],
                    rows
                  );
                  toast.success(t('customers.exportSuccess'));
                } catch (err) {
                  toast.error(err.message || 'Export failed');
                } finally {
                  setExporting(false);
                }
              }}
              className="btn-solid w-full px-4 py-2.5 text-[13px]"
            >
              <Download size={15} /> {exporting ? t('common.loading') : t('settings.downloadBackupBtn')}
            </button>
            <button
              type="button"
              onClick={handleHardRefresh}
              className="btn-solid w-full px-4 py-2.5 text-[13px]"
              title={t('settings.hardRefreshDesc', 'Clear cached app files and load the latest version')}
            >
              <RotateCw size={15} /> {t('settings.hardRefresh', 'Hard Refresh')}
            </button>
          </section>
        </div>

        {/* Right Column: Language + Billing Defaults + WhatsApp Reminders */}
        <div className="lg:col-span-7 space-y-5">
      {/* Language & Regional Section */}
      <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
            <Globe size={18} className="text-zinc-700" />
          </div>
          <div>
            <h2 className="text-[16px] font-display font-bold text-zinc-900">
              {t('settings.languageSection')}
            </h2>
            <p className="text-[13px] text-zinc-600 mt-0.5">
              {t('settings.languageDesc')}
            </p>
          </div>
        </div>
        <LanguageSelector variant="grid" />
      </section>

          {/* Ledger & Billing Defaults */}
          <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-zinc-700" />
              </div>
              <div>
                <h2 className="text-[16px] font-display font-bold text-zinc-900">
                  {t('settings.billingDefaultsSection')}
                </h2>
                <p className="text-[13px] text-zinc-600 mt-0.5">
                  {t('settings.defaultDueTermDesc')}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-700 mb-2">
                {t('settings.defaultDueTerm')}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {DUE_TERM_OPTIONS.map((opt) => {
                  const isActive = prefs.defaultDueDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        setPrefs(saveMerchantPrefs({ defaultDueDays: opt.days }));
                        toast.success(t('settings.prefsUpdated'));
                      }}
                      className={`py-2 px-3 rounded-md border text-[13px] font-semibold transition-colors duration-150 ${
                        isActive
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Change Password */}
          <section className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-zinc-700" />
                </div>
                <div>
                  <h2 className="text-[16px] font-display font-bold text-zinc-900">
                    Change Password
                  </h2>
                  <p className="text-[13px] text-zinc-600 mt-0.5">
                    Update your account password (minimum 8 characters)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="p-2 rounded-md border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              >
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label htmlFor="currentPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="confirmNewPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmNewPassword"
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingPassword}
                className="btn-primary w-full sm:w-auto"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>
        </div>
      </div>
      )}

    </motion.div>
  );
}
