import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firmName, setFirmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [iconState, setIconState] = useState('Briefcase');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      setIconState('Loader2');
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setIconState('CheckCircle2');
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { firm_name: firmName, owner_name: ownerName } }
        });
        if (error) throw error;
        
        if (data?.session) {
          setIconState('CheckCircle2');
          navigate('/dashboard');
        } else {
          setErrorMsg('Registration successful! Check your email or login now.');
          setIsLogin(true);
        }
      }
    } catch (error) {
      setErrorMsg(error.message);
      setIconState('AlertCircle');
    } finally {
      setLoading(false);
    }
  };

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
            {isLogin ? 'Welcome Back' : 'Join UdharPe'}
          </h1>
          <p className="text-center text-neu-text mb-8 text-sm">
            {isLogin ? 'Log in to your firm\'s ledger.' : 'Register your business to get started.'}
          </p>
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-neu-bg shadow-neu-inner text-neu-danger p-4 rounded-xl mb-6 text-sm font-medium"
            >
              {errorMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6 overflow-hidden"
              >
                <div>
                  <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Firm Name</label>
                  <input 
                    type="text" required={!isLogin} value={firmName} onChange={e => setFirmName(e.target.value)}
                    placeholder="e.g. Sharma Electronics" className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Owner Name</label>
                  <input 
                    type="text" required={!isLogin} value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma" className="input-field"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Email Address</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setIconState('Eye')} onBlur={() => setIconState('Briefcase')}
                placeholder="you@example.com" className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1">Password</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setIconState('EyeOff')} onBlur={() => setIconState('Briefcase')}
                placeholder="••••••••" className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-solid w-full mt-4">
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Profile')}
              {!loading && <ArrowRight className="w-5 h-5 ml-1" />}
            </button>
          </form>

          <p className="text-center mt-8 text-sm font-medium text-neu-text">
            {isLogin ? "Don't have an account? " : "Already registered? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
              className="text-neu-primary font-bold hover:text-neu-primary-hover transition-colors px-2 py-1 rounded shadow-neu ml-2"
            >
              {isLogin ? 'Register Firm' : 'Log In Here'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
