import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Tilt3DCard } from '../components/FramerComponents';
import BrandMark from '../components/BrandMark';
import LanguageSelector from '../components/LanguageSelector';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-900">
      {/* Compact Single-Line Header */}
      <header className="w-full border-b border-zinc-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <span className="flex items-center" aria-label="UdharPe">
            <BrandMark size={40} />
          </span>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="compact" />
            <button
              onClick={() => navigate('/auth')}
              className="btn-solid px-5 py-2 text-[14px]"
            >
              {t('landing.signIn')}
            </button>
          </div>
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
            {t('landing.heroTitle')}
          </h1>

          <p className="text-[17px] text-zinc-600 mb-10 max-w-xl leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>

          <motion.button
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.14 }}
            onClick={() => navigate('/auth')}
            className="btn-primary text-[15px] px-7 py-3.5"
          >
            {t('landing.ctaPrimary')} <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </main>

      {/* Architectural 3-Column Feature Strip */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-10">
        <Tilt3DCard maxTilt={1.5}>
          <div className="grid md:grid-cols-3 bg-white border border-zinc-300 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200">
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">{t('landing.feature1Title')}</h2>
              <p className="text-[15px] text-zinc-600">{t('landing.feature1Desc')}</p>
            </div>
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">{t('landing.feature2Title')}</h2>
              <p className="text-[15px] text-zinc-600">{t('landing.feature2Desc')}</p>
            </div>
            <div className="p-6">
              <h2 className="text-[17px] font-display font-bold text-zinc-900 mb-1.5">{t('landing.feature3Title')}</h2>
              <p className="text-[15px] text-zinc-600">{t('landing.feature3Desc')}</p>
            </div>
          </div>
        </Tilt3DCard>
      </section>

      {/* Subscription Plans (In Development — No Pricing) */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-14">
        <div className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-zinc-200">
            <div>
              <span className="inline-block text-[12px] font-semibold uppercase tracking-wider text-zinc-700 bg-zinc-100 border border-zinc-200 rounded px-2.5 py-0.5 mb-2">
                {t('plans.badge')}
              </span>
              <h2 className="text-2xl font-display font-bold text-zinc-900 tracking-tight">
                {t('plans.sectionTitle')}
              </h2>
              <p className="text-[15px] text-zinc-600 mt-1 max-w-2xl">
                {t('plans.sectionSubtitle')}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 pt-6">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-[16px] font-display font-bold text-zinc-900">{t('plans.freeTierTitle')}</h3>
                <span className="text-[12px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 shrink-0">
                  {t('plans.freeTierStatus')}
                </span>
              </div>
              <p className="text-[14px] text-zinc-600 leading-relaxed">{t('plans.freeTierDesc')}</p>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-[16px] font-display font-bold text-zinc-900">{t('plans.proTierTitle')}</h3>
                <span className="text-[12px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 rounded px-2 py-0.5 shrink-0">
                  {t('plans.proTierStatus')}
                </span>
              </div>
              <p className="text-[14px] text-zinc-600 leading-relaxed">{t('plans.proTierDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-300 py-5 px-6 flex justify-center gap-6 text-[13px] font-medium text-zinc-600">
        <button onClick={() => navigate('/privacy-policy')} className="hover:text-zinc-900 transition-colors duration-150">
          {t('landing.privacy')}
        </button>
        <button onClick={() => navigate('/terms-of-service')} className="hover:text-zinc-900 transition-colors duration-150">
          {t('landing.terms')}
        </button>
      </footer>
    </div>
  );
}
