import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-black text-neu-heading tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm font-medium text-neu-text mb-8">Last Updated: July 2026</p>

        <div className="space-y-6 text-neu-text leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">1. Introduction</h2>
            <p>Welcome to UdharPe. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website or use our application.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">2. Data We Collect</h2>
            <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together follows:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Identity Data:</strong> includes first name, last name, and firm name.</li>
              <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
              <li><strong>Financial Data:</strong> transaction records and ledger entries input by you regarding your customers.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">3. How We Use Your Data</h2>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To register you as a new business user.</li>
              <li>To provide and maintain our service.</li>
              <li>To send transactional emails and reminders.</li>
              <li>To notify you about changes to our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">4. Data Security</h2>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. All data is securely stored and encrypted where appropriate.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neu-heading mb-3">5. Contact Us</h2>
            <p>If you have any questions about this privacy policy or our privacy practices, please contact us at support@udharpe.com.</p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
