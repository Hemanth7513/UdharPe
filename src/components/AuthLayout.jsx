import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, PlusCircle, LogOut, IndianRupee } from 'lucide-react';
import logo from '../assets/logo.png';

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Raise Bill', path: '/billing', icon: PlusCircle },
    { name: 'Settle', path: '/settle', icon: IndianRupee },
  ];

  return (
    <div className="min-h-screen bg-neu-bg flex flex-col">
      {/* Unified Top Navbar */}
      <nav className="w-full bg-neu-bg shadow-neu sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img src={logo} alt="UdharPe" className="w-10 h-10 rounded-xl shadow-neu-inner object-cover" />
              <span className="text-xl font-black text-neu-heading tracking-tight hidden sm:block">UdharPe</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all ${
                      isActive 
                        ? 'shadow-neu-inner text-neu-primary' 
                        : 'text-neu-text hover:text-neu-primary hover:shadow-neu-hover'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLogout}
                className="w-10 h-10 neu-card flex items-center justify-center text-neu-text hover:text-neu-danger transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar (Bottom of screen on mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neu-bg shadow-[0_-10px_20px_rgba(163,177,198,0.3)] z-50 px-4 py-3 pb-safe">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                    isActive ? 'shadow-neu-inner text-neu-primary' : 'text-neu-text'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-bold">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-8 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
