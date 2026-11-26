import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { Settings as SettingsIcon, LogOut, User, Mail, Briefcase, Edit2, Save, X, ShieldCheck, Globe, Calendar, Download } from 'lucide-react';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsAdmin(isSuperAdminUser(user));

      const userProfile = {
        firm_name: user.user_metadata?.firm_name || '',
        owner_name: user.user_metadata?.owner_name || '',
        email: user.email || ''
      };
      
      setProfile(userProfile);
      setOriginalProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
      if (profileError) throw profileError;
      
      setOriginalProfile(profile);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-neu-primary font-bold">Loading Settings...</div>
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
        <div className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-zinc-700">Access Level</label>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-zinc-50 border border-zinc-200 font-semibold text-zinc-900">
              <ShieldCheck size={18} className="text-zinc-900" />
              <span>Platform Superadmin</span>
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

          <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn-primary flex-1 py-2.5"
            >
              Open Platform Command Center
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 text-red-700 font-semibold transition-colors duration-150 text-[14px]"
            >
              <LogOut size={18} /> Log Out Securely
            </button>
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
        </div>
      </div>
      )}

      {isAdmin && (
        <section className="mt-5 bg-white border border-zinc-300 rounded-lg p-6 sm:p-8 space-y-4">
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
      )}
    </motion.div>
  );
}
