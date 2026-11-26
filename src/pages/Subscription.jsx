import { motion } from 'framer-motion';
import { Sparkles, Check, Clock } from 'lucide-react';

const CORE_FEATURES = [
  'Unlimited customer Udhar & Jama entries',
  'PDF & CSV ledger statements',
  'Email payment reminders & PDF statements',
  'English, Hindi, Telugu & Tamil interface',
];

const UPCOMING_FEATURES = [
  'WhatsApp payment reminders (instant & scheduled)',
  'Multi-staff access & role permissions',
  'Advanced business & aging analytics',
  'Priority merchant support',
];

export default function Subscription() {
  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-white border border-zinc-300 flex items-center justify-center text-zinc-900 shrink-0">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">
            Subscription
          </h1>
          <p className="text-zinc-600 text-[14px] mt-0.5">
            Plans &amp; upcoming features for your business
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Current Active Plan */}
        <section className="bg-white border border-zinc-300 rounded-lg p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-display font-bold text-zinc-900">
                Core Ledger
              </h2>
              <span className="text-[12px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5 shrink-0">
                Active Now
              </span>
            </div>
            <p className="text-[14px] text-zinc-600 leading-relaxed mb-5">
              Your core business credit ledger is active and ready for daily use.
            </p>
            <ul className="space-y-2.5">
              {CORE_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-[14px] text-zinc-800">
                  <Check size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Upcoming Subscription Plans (No Pricing — Working on it) */}
        <section className="bg-white border border-dashed border-zinc-300 rounded-lg p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-display font-bold text-zinc-900">
                Business &amp; Pro Plans
              </h2>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded px-2.5 py-0.5 shrink-0">
                <Clock size={12} /> Working on it
              </span>
            </div>
            <p className="text-[14px] text-zinc-600 leading-relaxed mb-5">
              We are currently working on our subscription plans for growing businesses. Plan details will be announced soon.
            </p>
            <ul className="space-y-2.5">
              {UPCOMING_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-[14px] text-zinc-600">
                  <Sparkles size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-zinc-200">
            <p className="text-[13px] font-medium text-zinc-500">
              Coming soon — stay tuned for updates.
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
