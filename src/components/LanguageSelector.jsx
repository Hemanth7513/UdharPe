import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

/**
 * Reusable language selector for English, Hindi, Telugu, and Tamil.
 * Supports 'grid' (for Settings) and 'compact' (for headers / auth screens).
 */
export default function LanguageSelector({ variant = 'grid' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
  };

  if (variant === 'compact') {
    return (
      <div className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 px-2.5 text-[13px] font-medium text-zinc-700 transition-colors duration-150">
        <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <select
          aria-label="Language"
          value={currentLang}
          onChange={(e) => handleSelect(e.target.value)}
          className="bg-transparent text-zinc-900 font-medium focus:outline-none cursor-pointer pr-0.5"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code)}
            className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all duration-150 ${
              isSelected
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50'
            }`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-base font-semibold leading-tight">{lang.nativeLabel}</span>
              {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
            </div>
            <span
              className={`mt-1 text-xs ${
                isSelected ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
