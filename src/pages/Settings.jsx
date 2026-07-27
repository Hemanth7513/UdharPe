import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, LogOut, User, Mail, Briefcase, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
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
      const { error } = await supabase.auth.updateUser({
        data: {
          firm_name: profile.firm_name,
          owner_name: profile.owner_name
        }
      });
      if (error) throw error;
      
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
      className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-12"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shadow-neu rounded-none flex items-center justify-center text-neu-primary bg-neu-bg">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Settings</h1>
            <p className="text-neu-text font-bold text-sm mt-1">Manage your firm profile</p>
          </div>
        </div>
        
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="neu-card p-3 text-neu-primary hover:text-white hover:bg-neu-primary transition-all"
            title="Edit Profile"
          >
            <Edit2 size={18} />
          </button>
        )}
      </header>

      <form onSubmit={handleSaveProfile} className="neu-card p-6 sm:p-8 space-y-6">
        
        <div className="space-y-1">
          <label htmlFor="firmName" className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Firm Name</label>
          <div className="relative">
            <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neu-primary" />
            <input 
              id="firmName"
              type="text" 
              required
              disabled={!isEditing}
              value={profile.firm_name}
              onChange={(e) => setProfile({...profile, firm_name: e.target.value})}
              className={`w-full pl-12 pr-4 py-4 rounded-none font-bold text-neu-heading outline-none transition-all ${isEditing ? 'bg-neu-bg border-4 border-[#059669] bg-white focus:ring-2 focus:ring-neu-primary/30 border border-4 border-[#059669]' : 'bg-transparent shadow-none'}`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="ownerName" className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Owner Name</label>
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neu-primary" />
            <input 
              id="ownerName"
              type="text" 
              required
              disabled={!isEditing}
              value={profile.owner_name}
              onChange={(e) => setProfile({...profile, owner_name: e.target.value})}
              className={`w-full pl-12 pr-4 py-4 rounded-none font-bold text-neu-heading outline-none transition-all ${isEditing ? 'bg-neu-bg border-4 border-[#059669] bg-white focus:ring-2 focus:ring-neu-primary/30 border border-4 border-[#059669]' : 'bg-transparent shadow-none'}`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neu-text uppercase tracking-wider pl-1">Email Address</label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neu-primary opacity-50" />
            <input 
              type="email" 
              disabled
              value={profile.email}
              className="w-full pl-12 pr-4 py-4 rounded-none font-bold text-neu-heading bg-transparent shadow-none opacity-70"
            />
          </div>
          {isEditing && <p className="text-xs text-neu-text pl-1 mt-1 italic">Email cannot be changed here.</p>}
        </div>

        {isEditing && (
          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={handleCancel}
              className="flex-1 py-4 rounded-none shadow-neu text-neu-heading font-bold hover:shadow-neu-hover transition-all flex items-center justify-center gap-2"
            >
              <X size={18} /> Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 btn-solid py-4"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="pt-6 mt-6 border-t border-white/20">
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full py-4 rounded-none shadow-neu flex items-center justify-center gap-2 text-neu-danger font-bold hover:shadow-neu-hover transition-all bg-neu-bg"
            >
              <LogOut size={20} /> Log Out Securely
            </button>
          </div>
        )}

      </form>
    </motion.div>
  );
}
