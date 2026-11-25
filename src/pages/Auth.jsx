import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Mail, Key } from 'lucide-react';
import BrandMark from '../components/BrandMark';

export default function Auth({ isRecovering }) {
  const navigate = useNavigate();
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
      case 'signup': return { title: 'Join UdharPe', subtitle: 'Register your business to get started.' };
      case 'forgot_password': return { title: 'Reset Password', subtitle: 'Enter your email to receive a reset link.' };
      case 'magic_link': return { title: 'Magic Link Login', subtitle: 'Get a secure login link sent to your email.' };
      case 'update_password': return { title: 'Set New Password', subtitle: 'Enter your new password below.' };
      default: return { title: 'Welcome Back', subtitle: 'Log in to your firm\'s ledger.' };
    }
  };

  const { title, subtitle } = renderHeader();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f4f4f5]">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2.5 text-[24px] font-display font-bold tracking-tight text-zinc-900"
          >
            <BrandMark size={32} />
            <span>UdharPe</span>
          </button>
        </div>

        <div className="bg-white border border-zinc-300 rounded-lg p-7 sm:p-9" style={{ perspective: '900px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={authMode}
              initial={{ opacity: 0, rotateX: -6, y: 6 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, rotateX: 6, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-zinc-900 bg-zinc-100 border border-zinc-200">
                  {iconState === 'Briefcase' && <Briefcase className="w-6 h-6" />}
                  {iconState === 'Eye' && <Eye className="w-6 h-6" />}
                  {iconState === 'EyeOff' && <EyeOff className="w-6 h-6" />}
                  {iconState === 'Loader2' && <Loader2 className="w-6 h-6 animate-spin" />}
                  {iconState === 'CheckCircle2' && <CheckCircle2 className="w-6 h-6 text-emerald-700" />}
                  {iconState === 'AlertCircle' && <AlertCircle className="w-6 h-6 text-red-600" />}
                </div>
              </div>

              <h1 className="text-2xl font-display font-bold text-center text-zinc-900 mb-1.5 tracking-tight">
                {title}
              </h1>
              <p className="text-center text-zinc-600 mb-7 text-[15px]">
                {subtitle}
              </p>
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
                  <label htmlFor="firmName" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">Firm Name</label>
                  <input
                    id="firmName"
                    type="text" required value={firmName} onChange={e => setFirmName(e.target.value)}
                    placeholder="e.g. Sharma Electronics" className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="ownerName" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">Owner Name</label>
                  <input
                    id="ownerName"
                    type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma" className="input-field"
                  />
                </div>
              </div>
            )}

            {authMode !== 'update_password' && (
              <div>
                <label htmlFor="email" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">Email Address</label>
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
                    {authMode === 'update_password' ? 'New Password' : 'Password'}
                  </label>
                  <input
                    id="password"
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIconState('EyeOff')} onBlur={() => setIconState('Briefcase')}
                    placeholder="••••••••" className="input-field"
                  />
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
              {loading ? 'Processing...' : (
                authMode === 'login' ? 'Log In' :
                authMode === 'signup' ? 'Create Profile' :
                authMode === 'forgot_password' ? 'Send Reset Link' :
                authMode === 'magic_link' ? 'Send Magic Link' :
                'Update Password'
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {authMode === 'login' && (
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setAuthMode('magic_link'); setErrorMsg(''); }}
                className="flex items-center justify-center gap-2 text-[13px] text-zinc-900 font-semibold hover:underline"
              >
                <Mail size={15} /> OTP / Magic Link
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); }}
                className="flex items-center justify-center gap-2 text-[13px] text-zinc-600 font-semibold hover:text-zinc-900"
              >
                <Key size={15} /> Forgot Password?
              </button>
            </div>
          )}

          {authMode !== 'login' && authMode !== 'update_password' && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className="block text-center w-full mt-6 text-[13px] text-zinc-700 font-semibold hover:text-zinc-900 transition-colors duration-150"
            >
              Back to Login
            </button>
          )}

          <div className="mt-7 pt-5 border-t border-zinc-200">
            <p className="text-center text-[14px] text-zinc-600 mb-3">
              {authMode === 'signup' ? 'Already registered? ' : "Don't have an account? "}
              <button
                onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setErrorMsg(''); }}
                className="text-zinc-900 font-bold hover:underline ml-1"
              >
                {authMode === 'signup' ? 'Log In Here' : 'Register Firm'}
              </button>
            </p>
            <div className="flex justify-center gap-5 text-[13px] text-zinc-500">
              <button onClick={() => navigate('/privacy-policy')} className="hover:text-zinc-900 transition-colors duration-150">Privacy Policy</button>
              <button onClick={() => navigate('/terms-of-service')} className="hover:text-zinc-900 transition-colors duration-150">Terms of Service</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
