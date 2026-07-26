import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-neu-bg">
      
      {/* Abstract Neumorphic Background Elements */}
      <motion.div 
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full neu-card -z-10"
      />
      <motion.div 
        animate={{ y: [0, 30, 0], scale: [1, 0.95, 1] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full neu-card -z-10"
      />
      <motion.div 
        animate={{ y: [0, -15, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 right-1/3 w-[150px] h-[150px] rounded-full neu-card opacity-50 -z-10"
      />

      {/* Minimal Navbar */}
      <nav className="w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shadow-neu-inner rounded-2xl flex items-center justify-center text-neu-primary font-black text-2xl bg-neu-bg">
            U
          </div>
          <span className="text-2xl font-black tracking-tight text-neu-heading">UdharPe</span>
        </div>
        <button onClick={() => navigate('/auth')} className="btn-solid text-sm px-6 py-2.5">
          Login
        </button>
      </nav>

      {/* Ultra Minimal Hero */}
      <main className="flex-grow flex items-center justify-center z-10 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl"
        >
          
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-neu-heading leading-[1.1] tracking-tight mb-6 drop-shadow-sm">
            Udhar.<br />
            <span className="text-neu-primary">Simplified.</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-neu-text font-medium mb-12 max-w-2xl mx-auto">
            The elegant, private ledger for modern business owners. No clutter, no confusing menus. Just clarity.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <button 
              onClick={() => navigate('/auth')} 
              className="btn-solid text-xl px-10 py-5 w-full sm:w-auto shadow-neu-hover"
            >
              Open Your Ledger <ArrowRight className="ml-2" size={24} />
            </button>
          </div>

        </motion.div>
      </main>

    </div>
  );
}
