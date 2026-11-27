import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight mb-1.5">Privacy Policy</h1>
          <p className="text-[13px] font-medium text-zinc-500 pb-6 border-b border-zinc-200">Last Updated: July 2026</p>

          <div className="divide-y divide-zinc-200 text-[15px] text-zinc-700 leading-relaxed max-w-[65ch]">
            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">1. Introduction</h2>
              <p>Welcome to UdharPe. We respect your privacy and are committed to protecting your personal data. This privacy policy informs you how we look after your personal data when you visit our website or use our application.</p>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">2. Data We Collect</h2>
              <p>We may collect, use, store, and transfer different kinds of personal data about you, grouped together as follows:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1.5">
                <li><strong className="text-zinc-900">Identity Data:</strong> includes first name, last name, and firm name.</li>
                <li><strong className="text-zinc-900">Contact Data:</strong> includes email address and telephone numbers.</li>
                <li><strong className="text-zinc-900">Financial Data:</strong> transaction records and ledger entries input by you regarding your customers.</li>
                <li><strong className="text-zinc-900">Technical Data:</strong> includes internet protocol (IP) address, login data, browser type and version.</li>
              </ul>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">3. How We Use Your Data</h2>
              <p>We only use your personal data when the law allows us to. Most commonly, we use your personal data in the following circumstances:</p>
              <ul className="list-disc pl-5 mt-3 space-y-1.5">
                <li>To register you as a new business user.</li>
                <li>To provide and maintain our service.</li>
                <li>To send transactional emails and reminders.</li>
                <li>To notify you about changes to our service.</li>
              </ul>
            </section>

            <section className="py-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">4. Data Security</h2>
              <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. All data is securely stored and encrypted where appropriate.</p>
            </section>

            <section className="pt-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-2">5. Contact Us</h2>
              <p>If you have any questions about this privacy policy or our privacy practices, please contact us at support@udharpe.com.</p>
            </section>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
