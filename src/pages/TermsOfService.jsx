import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-zinc-900">
      <header className="w-full border-b border-zinc-300 bg-[#f4f4f5]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-700 hover:text-zinc-900 transition-colors duration-150"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="UdharPe Home"
            className="flex items-center hover:opacity-85 transition-opacity duration-150"
          >
            <BrandMark size={38} />
          </button>
        </div>
      </header>

      <motion.main
        className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="bg-white border border-zinc-300 rounded-lg p-7 sm:p-11">
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight mb-1.5">Terms of Service</h1>
          <p className="text-[13px] font-medium text-zinc-500 pb-6 border-b border-zinc-200">Last Updated: July 2026</p>

          <div className="divide-y divide-zinc-200 text-[15px] text-zinc-700 leading-relaxed max-w-[65ch]">
            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">1. Agreement to Terms</h2>
              <p>By accessing or using UdharPe, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">2. Description of Service</h2>
              <p>UdharPe is a digital ledger application designed for businesses to record credit transactions (Udhar) and payments with their customers. We do not process payments directly, but rather act as a record-keeping tool.</p>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">3. User Accounts</h2>
              <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.</p>
              <p className="mt-3">You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">4. Acceptable Use</h2>
              <p>You agree not to use the Service:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1.5">
                <li>In any way that violates any applicable national or international law or regulation.</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
                <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
              </ul>
            </section>

            <section className="pt-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">5. Disclaimer</h2>
              <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. UdharPe is not responsible for any lost revenue, disputes between you and your customers, or data inaccuracies.</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
