import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in pb-20"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 w-10 h-10 neu-card flex items-center justify-center text-neu-text hover:text-neu-primary transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="neu-card p-8 sm:p-12">
        <h1 className="text-3xl font-black text-neu-heading tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm font-medium text-neu-text mb-8">Last Updated: July 2026</p>

        <div className="space-y-6 text-neu-text leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">1. Agreement to Terms</h2>
            <p>By accessing or using UdharPe, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">2. Description of Service</h2>
            <p>UdharPe is a digital ledger application designed for businesses to record credit transactions (Udhar) and payments with their customers. We do not process payments directly, but rather act as a record-keeping tool.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">3. User Accounts</h2>
            <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.</p>
            <p className="mt-2">You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Service:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
              <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">5. Disclaimer</h2>
            <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. UdharPe is not responsible for any lost revenue, disputes between you and your customers, or data inaccuracies.</p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
