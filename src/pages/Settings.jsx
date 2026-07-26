import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, LogOut, User, Mail, Briefcase } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    firm_name: '',
    owner_name: '',
    email: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setProfile({
        firm_name: user.user_metadata?.firm_name || 'Your Business',
        owner_name: user.user_metadata?.owner_name || 'Not provided',
        email: user.email || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
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
      className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-12"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 shadow-neu rounded-2xl flex items-center justify-center text-neu-primary bg-neu-bg">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Settings</h1>
          <p className="text-neu-text font-medium text-sm mt-1">Manage your firm profile</p>
        </div>
      </header>

      <div className="neu-card p-6 sm:p-8 space-y-6">
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Firm Name</label>
          <div className="flex items-center gap-3 bg-neu-bg shadow-neu-inner px-4 py-4 rounded-xl">
            <Briefcase size={18} className="text-neu-primary shrink-0" />
            <span className="font-bold text-neu-heading text-lg">{profile.firm_name}</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Owner Name</label>
          <div className="flex items-center gap-3 bg-neu-bg shadow-neu-inner px-4 py-4 rounded-xl">
            <User size={18} className="text-neu-primary shrink-0" />
            <span className="font-bold text-neu-heading text-lg">{profile.owner_name}</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Email Address</label>
          <div className="flex items-center gap-3 bg-neu-bg shadow-neu-inner px-4 py-4 rounded-xl">
            <Mail size={18} className="text-neu-primary shrink-0" />
            <span className="font-medium text-neu-heading">{profile.email}</span>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-white/20">
          <button 
            onClick={handleLogout}
            className="w-full py-4 rounded-xl shadow-neu flex items-center justify-center gap-2 text-neu-danger font-bold hover:shadow-neu-hover transition-all bg-neu-bg"
          >
            <LogOut size={20} /> Log Out Securely
          </button>
        </div>

      </div>
    </motion.div>
  );
}
