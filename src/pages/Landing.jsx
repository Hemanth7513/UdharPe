import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Tilt3DCard } from '../components/FramerComponents';

const SAMPLE_ENTRIES = [
  { id: '1', party: 'Sharma Traders', detail: 'INV-204', status: 'Pending', amount: '₹12,500', type: 'bill', color: 'text-red-600' },
  { id: '2', party: 'Patel Hardware', detail: 'Payment Received', status: 'Paid', amount: '₹8,000', type: 'settlement', color: 'text-emerald-700' },
  { id: '3', party: 'Verma Electronics', detail: 'INV-191', status: 'Partial', amount: '₹24,000', type: 'bill', color: 'text-amber-700' },
];

export default function Landing() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [previewTab, setPreviewTab] = useState('all');

  const visibleEntries = SAMPLE_ENTRIES.filter((e) => previewTab === 'all' || e.type === previewTab);

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

      {/* Monumental Centered Stage + Interactive 3D Ledger Preview */}
      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 w-full">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center mb-10"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-bold text-zinc-900 leading-[0.98] tracking-[-0.04em] mb-5">
            Business credit, tracked accurately and cleared on time.
          </h1>

          <p className="text-[17px] text-zinc-600 mb-8 max-w-xl leading-relaxed">
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

        {/* Subtle Interactive 3D Perspective Workbench */}
        <div className="w-full max-w-3xl">
          <Tilt3DCard maxTilt={2.5}>
            <div className="bg-white border border-zinc-300 rounded-lg shadow-elevated overflow-hidden">
              <div className="grid grid-cols-3 border-b border-zinc-200 divide-x divide-zinc-200 bg-zinc-50/70">
                <div className="p-3 sm:p-5 min-w-0">
                  <p className="text-[12px] sm:text-[13px] text-zinc-500 font-medium truncate">Total Udhar</p>
                  <p className="text-[16px] sm:text-2xl font-display font-bold text-red-600 tabular-nums mt-0.5 truncate">₹1,84,500</p>
                </div>
                <div className="p-3 sm:p-5 min-w-0">
                  <p className="text-[12px] sm:text-[13px] text-zinc-500 font-medium truncate">Received</p>
                  <p className="text-[16px] sm:text-2xl font-display font-bold text-emerald-700 tabular-nums mt-0.5 truncate">₹92,400</p>
                </div>
                <div className="p-3 sm:p-5 min-w-0">
                  <p className="text-[12px] sm:text-[13px] text-zinc-500 font-medium truncate">Udhar Given</p>
                  <p className="text-[16px] sm:text-2xl font-display font-bold text-zinc-900 tabular-nums mt-0.5 truncate">₹64,200</p>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex justify-between items-center pb-3 mb-2 border-b border-zinc-200">
                  <span className="font-display font-bold text-[15px] text-zinc-900">Sample Ledger</span>
                  <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-md border border-zinc-200">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'bill', label: 'Bills' },
                      { id: 'settlement', label: 'Payments' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPreviewTab(tab.id)}
                        className={`relative px-3 py-1 rounded text-[13px] font-semibold transition-colors duration-150 ${
                          previewTab === tab.id ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {previewTab === tab.id && (
                          <motion.span
                            layoutId="landingPreviewTab"
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 bg-white rounded shadow-neu"
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-zinc-100">
                  {visibleEntries.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="py-3 flex justify-between items-center text-[14px]"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900">{item.party}</span>
                        <span className="text-zinc-500 ml-2">· {item.detail}</span>
                      </div>
                      <div className="font-display font-bold tabular-nums">
                        <span className={item.color}>{item.amount}</span>
                        <span className="text-zinc-500 font-sans font-medium ml-2">· {item.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Tilt3DCard>
        </div>
      </main>

      {/* Architectural 3-Column Feature Strip */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-12">
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
