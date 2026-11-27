import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BrandMark from '../components/BrandMark';
import LanguageSelector from '../components/LanguageSelector';

export default function Auth({ isRecovering }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [authMode, setAuthMode] = useState(isRecovering ? 'update_password' : 'login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firmName, setFirmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [iconState, setIconState] = useState('Briefcase');

  useEffect(() => {
    if (isRecovering) {
      setAuthMode('update_password');
    }
  }, [isRecovering]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setIconState('Loader2');

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setIconState('CheckCircle2');
        const isAdmin = isSuperAdminUser(data.user);
        navigate(isAdmin ? '/admin' : '/dashboard');
      } else if (authMode === 'signup') {
        const { data, error: fnError } = await supabase.functions.invoke('send-auth-email', {
          body: {
            email,
            password,
            type: 'signup',
            options: { data: { firm_name: firmName, owner_name: ownerName } }
          }
        });
        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || 'Failed to register via Resend');
        }

        setIconState('CheckCircle2');
        setErrorMsg('Registration successful! Check your email or login now.');
        setAuthMode('login');
      } else if (authMode === 'forgot_password') {
        const { data, error: fnError } = await supabase.functions.invoke('send-auth-email', {
          body: { email, type: 'recovery' }
        });
        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || 'Failed to send reset link via Resend');
        }

        setIconState('CheckCircle2');
        setErrorMsg('Password reset link sent to your email!');
        setAuthMode('login');
      } else if (authMode === 'magic_link') {
        const { data, error: fnError } = await supabase.functions.invoke('send-auth-email', {
          body: { email, type: 'magiclink' }
        });
        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || 'Failed to send magic link via Resend');
        }

        setIconState('CheckCircle2');
        setErrorMsg('Magic link sent! Check your inbox to log in.');
        setAuthMode('login');
      } else if (authMode === 'update_password') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        await supabase.auth.signOut();

        setIconState('CheckCircle2');
        setErrorMsg('Password updated successfully! Please log in with your new password.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Auth Error:', error);
      let safeMessage = error.message || 'An error occurred. Please try again.';

      if (authMode === 'login') {
        safeMessage = error.message || 'Invalid email or password.';
      } else if (authMode === 'forgot_password') {
        const isRateLimit = error.message && (
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('wait') ||
          error.status === 429
        );
        if (isRateLimit) {
          setErrorMsg(error.message);
          setIconState('AlertCircle');
          setLoading(false);
          return;
        }
        safeMessage = error.message || 'Failed to send reset link. Please check your email or try again later.';
      } else if (authMode === 'magic_link') {
        safeMessage = error.message || 'Failed to send magic link. Please try again.';
      }

      setErrorMsg(safeMessage);
      setIconState('AlertCircle');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (authMode) {
      case 'signup': return { title: t('auth.signUpTitle'), subtitle: '' };
      case 'forgot_password': return { title: t('auth.forgotTitle'), subtitle: '' };
      case 'magic_link': return { title: t('auth.magicLinkTitle'), subtitle: '' };
      case 'update_password': return { title: t('auth.updatePasswordTitle'), subtitle: '' };
      default: return { title: t('auth.signInTitle'), subtitle: '' };
    }
  };

  const { title, subtitle } = renderHeader();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#f4f4f5]">
      <motion.div
        className="w-full max-w-4xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="UdharPe Home"
            className="inline-flex items-center justify-center hover:opacity-85 transition-opacity duration-150"
          >
            <BrandMark size={44} />
          </button>
          <LanguageSelector variant="compact" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left Side Card: Mode Switcher & Actionable Quick Access */}
          <div className="md:col-span-5 flex flex-col justify-between gap-4 bg-white border border-zinc-300 rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-zinc-900 tracking-tight">
                  {title}
                </h1>
                <p className="text-[14px] text-zinc-600 mt-1">
                  {t('landing.heroSubtitle')}
                </p>
              </div>

              {authMode !== 'update_password' && (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left text-[14px] font-semibold transition-colors duration-150 ${
                      authMode === 'login'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <span>{t('auth.signInBtn')}</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left text-[14px] font-semibold transition-colors duration-150 ${
                      authMode === 'signup'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <span>{t('auth.signUpBtn')}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 flex justify-between text-[13px] text-zinc-500">
              <button onClick={() => navigate('/privacy-policy')} className="hover:text-zinc-900 transition-colors duration-150">{t('landing.privacy')}</button>
              <button onClick={() => navigate('/terms-of-service')} className="hover:text-zinc-900 transition-colors duration-150">{t('landing.terms')}</button>
            </div>
          </div>

          {/* Right Side Card: Form */}
          <div className="md:col-span-7 bg-white border border-zinc-300 rounded-lg p-7 sm:p-8 flex flex-col justify-center" style={{ perspective: '900px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={authMode}
              initial={{ opacity: 0, rotateX: -6, y: 6 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, rotateX: 6, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center text-zinc-900 bg-zinc-100 border border-zinc-200 shrink-0">
                {iconState === 'Briefcase' && <Briefcase className="w-5 h-5" />}
                {iconState === 'Eye' && <Eye className="w-5 h-5" />}
                {iconState === 'EyeOff' && <EyeOff className="w-5 h-5" />}
                {iconState === 'Loader2' && <Loader2 className="w-5 h-5 animate-spin" />}
                {iconState === 'CheckCircle2' && <CheckCircle2 className="w-5 h-5 text-emerald-700" />}
                {iconState === 'AlertCircle' && <AlertCircle className="w-5 h-5 text-red-600" />}
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-zinc-900 tracking-tight">
                  {title}
                </h2>
                {subtitle && <p className="text-zinc-600 text-[13px]">{subtitle}</p>}
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`p-3.5 rounded-md mb-6 text-[14px] font-medium border ${
                  errorMsg.includes('successful') || errorMsg.includes('sent') || errorMsg.includes('updated')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {authMode === 'signup' && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="firmName" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">{t('auth.firmNameLabel')}</label>
                  <input
                    id="firmName"
                    type="text" required value={firmName} onChange={e => setFirmName(e.target.value)}
                    placeholder={t('settings.firmNamePlaceholder')} className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="ownerName" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">{t('settings.ownerName')}</label>
                  <input
                    id="ownerName"
                    type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder={t('settings.ownerNamePlaceholder')} className="input-field"
                  />
                </div>
              </div>
            )}

            {authMode !== 'update_password' && (
              <div>
                <label htmlFor="email" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">{t('auth.emailLabel')}</label>
                <input
                  id="email"
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setIconState('Eye')} onBlur={() => setIconState('Briefcase')}
                  placeholder="you@example.com" className="input-field"
                />
              </div>
            )}

            {(authMode === 'login' || authMode === 'signup' || authMode === 'update_password') && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                    {t('auth.passwordLabel')}
                  </label>
                  <input
                    id="password"
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIconState('EyeOff')} onBlur={() => setIconState('Briefcase')}
                    placeholder="••••••••" className="input-field"
                  />
                  {(authMode === 'login' || authMode === 'signup') && (
                    <p className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2 font-medium">
                      Please remember your password — we are working on the Forgot Password feature.
                    </p>
                  )}
                </div>

                {authMode === 'update_password' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setIconState('EyeOff')} onBlur={() => setIconState('Briefcase')}
                      placeholder="••••••••" className="input-field"
                    />
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('common.loading') : (
                authMode === 'login' ? t('auth.signInBtn') :
                authMode === 'signup' ? t('auth.signUpBtn') :
                authMode === 'forgot_password' ? t('auth.sendResetLink') :
                authMode === 'magic_link' ? t('auth.sendMagicLink') :
                t('auth.updatePasswordBtn')
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
        </div>
      </motion.div>
    </div>
  );
}
