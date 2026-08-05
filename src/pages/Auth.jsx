import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Mail, Key } from 'lucide-react';

export default function Auth({ isRecovering }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(isRecovering ? 'update_password' : 'login'); // 'login', 'signup', 'forgot_password', 'magic_link', 'update_password'
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
    // Check if the user is coming from a password recovery email
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setIconState('CheckCircle2');
        navigate('/dashboard');
      } 
      else if (authMode === 'signup') {
        const { error } = await supabase.functions.invoke('send-auth-email', {
          body: { 
            email, 
            password, 
            type: 'signup',
            options: { data: { firm_name: firmName, owner_name: ownerName } }
          }
        });
        if (error) throw error;
        
        setIconState('CheckCircle2');
        setErrorMsg('Registration successful! Check your email or login now.');
        setAuthMode('login');
      }
      else if (authMode === 'forgot_password') {
        const { error } = await supabase.functions.invoke('send-auth-email', {
          body: { email, type: 'recovery' }
        });
        if (error) throw error;
        setIconState('CheckCircle2');
        setErrorMsg('Password reset link sent to your email!');
        setAuthMode('login');
      }
      else if (authMode === 'magic_link') {
        const { error } = await supabase.functions.invoke('send-auth-email', {
          body: { email, type: 'magiclink' }
        });
        if (error) throw error;
        setIconState('CheckCircle2');
        setErrorMsg('Magic link sent! Check your inbox to log in.');
        setAuthMode('login');
      }
      else if (authMode === 'update_password') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        // Force manual login after reset
        await supabase.auth.signOut();
        
        setIconState('CheckCircle2');
        setErrorMsg('Password updated successfully! Please log in with your new password.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error("Auth Error:", error); 
      let safeMessage = error.message === "Passwords do not match" 
        ? "Passwords do not match." 
        : "An error occurred. Please try again.";
      
      if (authMode === 'login' || authMode === 'magic_link') {
        safeMessage = "Invalid email or password.";
      } else if (authMode === 'forgot_password') {
        // If it's a rate limit error, show it to the user.
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
        // Otherwise, pretend it succeeded to prevent email enumeration attacks
        safeMessage = "If this email is registered, you will receive a reset link shortly.";
        setIconState('CheckCircle2');
        setErrorMsg(safeMessage);
        setAuthMode('login'); // Match the success UX
        setLoading(false);
        return;
      } else if (authMode === 'signup') {
        safeMessage = "Registration failed. Please check your details and try again.";
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md animate-slide-up"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="neu-card p-8 sm:p-10">
          
          <div className="flex justify-center mb-6">
            <motion.div 
              key={iconState}
              initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-20 h-20 shadow-neu rounded-full flex items-center justify-center text-neu-primary bg-neu-bg border border-white/50"
            >
              {iconState === 'Briefcase' && <Briefcase className="w-8 h-8" />}
              {iconState === 'Eye' && <Eye className="w-8 h-8" />}
              {iconState === 'EyeOff' && <EyeOff className="w-8 h-8" />}
              {iconState === 'Loader2' && <Loader2 className="w-8 h-8 animate-spin" />}
              {iconState === 'CheckCircle2' && <CheckCircle2 className="w-8 h-8 text-neu-success" />}
              {iconState === 'AlertCircle' && <AlertCircle className="w-8 h-8 text-neu-danger" />}
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold text-center text-neu-heading mb-2 tracking-tight">
            {title}
          </h1>
          <p className="text-center text-neu-text mb-8 text-sm">
            {subtitle}
          </p>
          
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className={`shadow-neu-inner p-4 rounded-xl mb-6 text-sm font-medium ${
                  errorMsg.includes('successful') || errorMsg.includes('sent') || errorMsg.includes('updated') 
                    ? 'bg-neu-primary/10 text-neu-primary' 
                    : 'bg-neu-bg text-neu-danger'
                }`}
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {authMode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6 overflow-hidden"
              >
                <div>
                  <label htmlFor="firmName" className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Firm Name</label>
                  <input 
                    id="firmName"
                    type="text" required value={firmName} onChange={e => setFirmName(e.target.value)}
                    placeholder="e.g. Sharma Electronics" className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Owner Name</label>
                  <input 
                    id="ownerName"
                    type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma" className="input-field"
                  />
                </div>
              </motion.div>
            )}

            {authMode !== 'update_password' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label htmlFor="email" className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Email Address</label>
                <input 
                  id="email"
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setIconState('Eye')} onBlur={() => setIconState('Briefcase')}
                  placeholder="you@example.com" className="input-field"
                />
              </motion.div>
            )}

            {(authMode === 'login' || authMode === 'signup' || authMode === 'update_password') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-neu-heading mb-2 pl-1">
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
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neu-heading mb-2 pl-1">
                      Confirm New Password
                    </label>
                    <input 
                      id="confirmPassword"
                      type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setIconState('EyeOff')} onBlur={() => setIconState('Briefcase')}
                      placeholder="••••••••" className="input-field"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            <button type="submit" disabled={loading} className="btn-solid w-full mt-4">
              {loading ? 'Processing...' : (
                authMode === 'login' ? 'Log In' : 
                authMode === 'signup' ? 'Create Profile' : 
                authMode === 'forgot_password' ? 'Send Reset Link' :
                authMode === 'magic_link' ? 'Send Magic Link' :
                'Update Password'
              )}
              {!loading && <ArrowRight className="w-5 h-5 ml-1" />}
            </button>
          </form>

          {authMode === 'login' && (
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
              <button 
                type="button"
                onClick={() => { setAuthMode('magic_link'); setErrorMsg(''); }}
                className="flex items-center justify-center gap-2 text-sm text-neu-primary font-bold hover:scale-105 transition-transform"
              >
                <Mail size={16} /> OTP / Magic Link
              </button>
              <button 
                type="button"
                onClick={() => { setAuthMode('forgot_password'); setErrorMsg(''); }}
                className="flex items-center justify-center gap-2 text-sm text-neu-text font-bold hover:scale-105 transition-transform"
              >
                <Key size={16} /> Forgot Password?
              </button>
            </div>
          )}

          {authMode !== 'login' && authMode !== 'update_password' && (
            <button 
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
              className="block text-center w-full mt-6 text-sm text-neu-text font-bold hover:text-neu-primary transition-colors"
            >
              Back to Login
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-center text-sm font-medium text-neu-text mb-4">
              {authMode === 'signup' ? "Already registered? " : "Don't have an account? "}
              <button 
                onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setErrorMsg(''); }}
                className="text-neu-primary font-bold hover:text-neu-primary-hover transition-colors px-2 py-1 rounded shadow-neu ml-2"
              >
                {authMode === 'signup' ? 'Log In Here' : 'Register Firm'}
              </button>
            </p>
            <div className="flex justify-center gap-4 text-xs font-medium text-neu-text/80">
              <button onClick={() => navigate('/privacy-policy')} className="hover:text-neu-primary transition-colors">Privacy Policy</button>
              <span>•</span>
              <button onClick={() => navigate('/terms-of-service')} className="hover:text-neu-primary transition-colors">Terms of Service</button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
