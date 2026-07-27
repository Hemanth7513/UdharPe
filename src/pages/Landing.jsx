import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, TrendingUp, Handshake } from 'lucide-react';

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

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden flex flex-col relative bg-neu-bg">
      
      {/* Ambient background decoration */}
      <motion.div 
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full shadow-neu opacity-40 bg-neu-bg -z-10"
      />
      <motion.div 
        animate={{ y: [0, 30, 0], scale: [1, 0.95, 1] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full shadow-neu opacity-40 bg-neu-bg -z-10"
      />

      {/* Minimal Navbar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full px-6 py-5 flex justify-between items-center max-w-7xl mx-auto z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl shadow-neu flex items-center justify-center bg-neu-bg text-neu-primary">
            <Handshake size={28} />
          </div>
          <span className="text-3xl font-black tracking-tight text-neu-heading">UdharPe</span>
        </div>
        <button onClick={() => navigate('/auth')} className="btn-solid text-sm px-6 py-2.5">
          Sign In
        </button>
      </motion.nav>

      {/* Ultra Minimal Hero */}
      <main className="flex-grow flex items-center justify-center max-w-7xl mx-auto px-6 py-12 w-full z-10">
        
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center max-w-3xl"
          >
            <motion.div variants={itemVariants} className="inline-block px-5 py-2 mb-8 rounded-full shadow-neu-inner text-neu-primary font-bold text-sm tracking-wide bg-neu-bg">
              The Elegant Business Ledger
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl lg:text-7xl font-black text-neu-heading leading-[1.1] mb-6">
              Business Udhar.<br />
              <span className="text-neu-primary">Managed Beautifully.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-neu-text mb-12 max-w-2xl font-medium leading-relaxed">
              No clutter, no confusing menus, no messy notebooks. UdharPe is the private, premium way to track what you're owed.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <button onClick={() => navigate('/auth')} className="btn-solid text-lg px-10 py-4 w-full sm:w-auto shadow-neu-hover">
                Open Your Ledger <ArrowRight size={22} className="ml-2" />
              </button>
            </motion.div>
          </motion.div>

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
      
      {/* Footer Links */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="w-full text-center pb-6 z-10 flex justify-center gap-4 text-xs font-medium text-neu-text/80"
      >
        <button onClick={() => navigate('/privacy-policy')} className="hover:text-neu-primary transition-colors">Privacy Policy</button>
        <span>•</span>
        <button onClick={() => navigate('/terms-of-service')} className="hover:text-neu-primary transition-colors">Terms of Service</button>
      </motion.footer>
    </div>
  );
}
