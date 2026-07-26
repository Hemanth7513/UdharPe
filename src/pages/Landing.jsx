import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, TrendingUp } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="w-full p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 neu-card flex items-center justify-center text-neu-primary font-bold text-xl">
            U
          </div>
          <span className="text-2xl font-bold tracking-tight text-neu-heading">UdharPe</span>
        </div>
        <div>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            Login / Signup
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neu-heading leading-tight mb-6">
              Track your business <span className="text-neu-primary">Udhar</span> with absolute clarity.
            </h1>
            <p className="text-lg text-neu-text mb-8 max-w-lg">
              Say goodbye to messy notebooks. UdharPe is the premium, simple way for business owners to manage customer dues, track payments, and get paid faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/auth')} className="btn-solid">
                Get Started for Free <ArrowRight size={20} />
              </button>
              <button className="btn-primary" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Hero Visual / Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="neu-card p-6 md:p-8 relative z-10 mx-auto max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl">Total Outstanding</h3>
                <span className="text-neu-danger font-bold text-lg">₹45,200</span>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="neu-card p-4 flex justify-between items-center shadow-sm border-none">
                    <div className="w-10 h-10 rounded-full bg-neu-bg shadow-neu-inner flex items-center justify-center text-neu-primary font-bold">
                      {['A', 'R', 'S'][i-1]}
                    </div>
                    <div className="flex-1 ml-4">
                      <div className="h-4 w-24 bg-neu-bg shadow-neu-inner rounded-full mb-2"></div>
                      <div className="h-3 w-16 bg-neu-bg shadow-neu-inner rounded-full"></div>
                    </div>
                    <div className="h-6 w-16 bg-neu-bg shadow-neu-inner rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full neu-card opacity-50 z-0"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full neu-card opacity-50 z-0"></div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-32 grid md:grid-cols-3 gap-8"
        >
          <div className="neu-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full shadow-neu flex items-center justify-center text-neu-primary">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Dead Simple</h3>
            <p className="text-neu-text">Log a new bill or settle a payment in under 30 seconds. No accounting degree required.</p>
          </div>
          <div className="neu-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full shadow-neu flex items-center justify-center text-neu-primary">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Bank-Grade Security</h3>
            <p className="text-neu-text">Your ledger is private. No other business can see your customers or your data.</p>
          </div>
          <div className="neu-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full shadow-neu flex items-center justify-center text-neu-primary">
              <TrendingUp size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Get Paid Faster</h3>
            <p className="text-neu-text">Track overdue bills instantly and know exactly who owes you money at a glance.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
