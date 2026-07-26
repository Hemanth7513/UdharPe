import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, TrendingUp } from 'lucide-react';
import logo from '../assets/logo.png';

// Animation Variants for staggered, buttery smooth animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 70, damping: 15 } 
  }
};

const floatingAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden flex flex-col relative bg-neu-bg">
      
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neu-primary/5 rounded-full blur-[100px] -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neu-primary/5 rounded-full blur-[80px] -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

      {/* Minimal Navbar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full px-6 py-5 flex justify-between items-center max-w-7xl mx-auto z-10"
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="UdharPe Logo" className="w-12 h-12 rounded-xl shadow-neu-inner object-cover" />
          <span className="text-2xl font-black tracking-tight text-neu-heading">UdharPe</span>
        </div>
        <button onClick={() => navigate('/auth')} className="btn-solid text-sm px-6 py-2.5">
          Sign In
        </button>
      </motion.nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center max-w-7xl mx-auto px-6 py-12 md:py-0 w-full z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center w-full">
          
          {/* Left Text Column */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <motion.div variants={itemVariants} className="inline-block px-5 py-2 mb-6 rounded-full shadow-neu-inner text-neu-primary font-bold text-sm tracking-wide">
              The Elegant Business Ledger
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl lg:text-7xl font-black text-neu-heading leading-[1.1] mb-6">
              Business Udhar.<br />
              <span className="text-neu-primary">Managed Beautifully.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg text-neu-text mb-10 max-w-xl font-medium leading-relaxed">
              No clutter, no confusing menus, no messy notebooks. UdharPe is the private, premium way to track what you're owed.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <button onClick={() => navigate('/auth')} className="btn-solid text-lg px-8 py-4 w-full sm:w-auto shadow-neu-hover">
                Open Your Ledger <ArrowRight size={22} className="ml-2" />
              </button>
            </motion.div>
          </motion.div>

          {/* Right Visual (The Selected Logo instead of dummy data) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, type: "spring", bounce: 0.3, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-lg mt-8 lg:mt-0 flex justify-center"
          >
            <motion.div animate={floatingAnimation} className="relative z-10 w-64 h-64 md:w-80 md:h-80 neu-card rounded-[3rem] p-4 flex items-center justify-center">
               <img src={logo} alt="UdharPe Logo" className="w-full h-full object-contain rounded-[2rem] shadow-neu-inner" />
            </motion.div>
            
            {/* Decorative Floating Orbs */}
            <motion.div 
              animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 right-10 w-24 h-24 rounded-full shadow-neu opacity-80 z-0 bg-neu-bg"
            />
            <motion.div 
              animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 left-10 w-16 h-16 rounded-full shadow-neu opacity-80 z-0 bg-neu-bg"
            />
          </motion.div>

        </div>
      </main>

      {/* Bottom Features Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="w-full max-w-7xl mx-auto px-6 pb-12 pt-8 mt-auto z-10"
      >
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner bg-neu-bg">
            <div className="w-12 h-12 shadow-neu rounded-full flex shrink-0 items-center justify-center text-neu-primary">
              <CheckCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-neu-heading">Dead Simple</h4>
              <p className="text-sm text-neu-text font-medium">Log entries in under 30s.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner bg-neu-bg">
            <div className="w-12 h-12 shadow-neu rounded-full flex shrink-0 items-center justify-center text-neu-primary">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="font-bold text-neu-heading">100% Private</h4>
              <p className="text-sm text-neu-text font-medium">Bank-grade data isolation.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner bg-neu-bg">
            <div className="w-12 h-12 shadow-neu rounded-full flex shrink-0 items-center justify-center text-neu-primary">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-bold text-neu-heading">Get Paid Faster</h4>
              <p className="text-sm text-neu-text font-medium">Track overdue bills instantly.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
