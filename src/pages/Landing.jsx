import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, TrendingUp } from 'lucide-react';

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
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden flex flex-col relative">
      
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
          <div className="w-10 h-10 shadow-neu rounded-xl flex items-center justify-center text-neu-primary font-black text-xl bg-neu-bg">
            U
          </div>
          <span className="text-xl font-black tracking-tight text-neu-heading">UdharPe</span>
        </div>
        <button onClick={() => navigate('/auth')} className="btn-solid text-sm px-5 py-2.5">
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
            <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 mb-6 rounded-full shadow-neu-inner text-neu-primary font-bold text-sm">
              The Modern Bahi-Khata 🚀
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-black text-neu-heading leading-tight mb-6">
              Track your business <br className="hidden lg:block"/>
              <span className="text-neu-primary">Udhar</span> with absolute clarity.
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg text-neu-text mb-10 max-w-xl font-medium leading-relaxed">
              Say goodbye to messy notebooks and stressful phone calls. UdharPe is the premium, dead-simple way to manage customer dues and get paid faster.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <button onClick={() => navigate('/auth')} className="btn-solid text-lg px-8 py-4 w-full sm:w-auto">
                Get Started Free <ArrowRight size={22} />
              </button>
            </motion.div>
          </motion.div>

          {/* Right Visual Mockup Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, type: "spring", bounce: 0.3, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-lg mt-8 lg:mt-0"
          >
            {/* The Main App Mockup */}
            <motion.div animate={floatingAnimation} className="neu-card p-6 md:p-8 relative z-10 mx-auto w-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-xl text-neu-heading">Total Outstanding</h3>
                <span className="text-neu-danger font-black text-xl">₹45,200</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'Ramesh Singh', amount: '₹12,500', color: 'text-neu-danger' },
                  { name: 'KMR Fashions', amount: '₹8,200', color: 'text-neu-primary' },
                  { name: 'Sharma Stores', amount: '₹24,500', color: 'text-neu-danger' }
                ].map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (i * 0.15) }}
                    key={i} 
                    className="p-4 flex justify-between items-center rounded-xl shadow-neu-inner"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full shadow-neu flex items-center justify-center text-neu-heading font-black">
                         {item.name.charAt(0)}
                       </div>
                       <div>
                         <div className="font-bold text-neu-heading">{item.name}</div>
                         <div className="text-xs text-neu-text font-medium mt-0.5">Due next week</div>
                       </div>
                    </div>
                    <div className={`font-black ${item.color}`}>{item.amount}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Decorative Floating Orbs */}
            <motion.div 
              animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full neu-card opacity-80 z-0"
            />
            <motion.div 
              animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full neu-card opacity-80 z-0"
            />
          </motion.div>

        </div>
      </main>

      {/* Bottom Features Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="w-full max-w-7xl mx-auto px-6 pb-12 pt-8 mt-auto"
      >
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner">
            <div className="w-12 h-12 shadow-neu rounded-full flex shrink-0 items-center justify-center text-neu-primary">
              <CheckCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-neu-heading">Dead Simple</h4>
              <p className="text-sm text-neu-text font-medium">Log entries in under 30s.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner">
            <div className="w-12 h-12 shadow-neu rounded-full flex shrink-0 items-center justify-center text-neu-primary">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="font-bold text-neu-heading">100% Private</h4>
              <p className="text-sm text-neu-text font-medium">Bank-grade data isolation.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inner">
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
