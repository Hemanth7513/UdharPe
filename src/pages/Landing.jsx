import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tilt3DCard } from '../components/FramerComponents';

export default function Landing() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-900">
      {/* Compact Single-Line Header */}
      <header className="w-full border-b border-zinc-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <span className="text-[22px] font-display font-bold tracking-tight text-zinc-900">
            UdharPe
          </span>
          <button
            onClick={() => navigate('/auth')}
            className="btn-solid px-5 py-2 text-[14px]"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Monumental Centered Stage */}
      <main className="flex-grow flex items-center justify-center max-w-5xl mx-auto px-6 py-16 w-full">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold text-zinc-900 leading-[0.98] tracking-[-0.04em] mb-6">
            Business credit, tracked accurately and cleared on time.
          </h1>

          <p className="text-[17px] text-zinc-600 mb-10 max-w-xl leading-relaxed">
            Replace messy paper notebooks with a cloud-synced ledger. Record daily credit, track settlements, and keep clear accounts with your customers.
          </p>

          <motion.button
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.14 }}
            onClick={() => navigate('/auth')}
            className="btn-primary text-[15px] px-7 py-3.5"
          >
            Open Your Free Ledger <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </main>

      {/* Architectural 3-Column Feature Strip */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-12">
        <Tilt3DCard maxTilt={1.5}>
          <div className="grid md:grid-cols-3 bg-white border border-zinc-300 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200">
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">Fast daily entries</h2>
              <p className="text-[15px] text-zinc-600">Record bills and customer payments in seconds from phone or desktop.</p>
            </div>
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">Isolated business data</h2>
              <p className="text-[15px] text-zinc-600">Every merchant account runs on strict row-level security and append-only ledgers.</p>
            </div>
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">Faster collections</h2>
              <p className="text-[15px] text-zinc-600">Spot overdue balances immediately and send WhatsApp or email reminders.</p>
            </div>
          </div>
        </Tilt3DCard>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-300 py-5 px-6 flex justify-center gap-6 text-[13px] font-medium text-zinc-600">
        <button onClick={() => navigate('/privacy-policy')} className="hover:text-zinc-900 transition-colors duration-150">
          Privacy Policy
        </button>
        <button onClick={() => navigate('/terms-of-service')} className="hover:text-zinc-900 transition-colors duration-150">
          Terms of Service
        </button>
      </footer>
    </div>
  );
}
