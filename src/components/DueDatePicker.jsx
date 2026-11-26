import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIntlLocale } from '../i18n';

const QUICK_TERMS = [
  { id: '0', labelKey: 'dueDate.today', days: 0 },
  { id: '7', labelKey: 'dueDate.days7', days: 7 },
  { id: '15', labelKey: 'dueDate.days15', days: 15 },
  { id: '30', labelKey: 'dueDate.days30', days: 30 },
  { id: '45', labelKey: 'dueDate.days45', days: 45 },
];

function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToToday(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

/**
 * Merchant-first Due Date selector with connected quick-term presets
 * and an Architectural Stone popover calendar for custom dates.
 */
export default function DueDatePicker({ value, onChange }) {
  const { t, i18n } = useTranslation();
  const intlLocale = getIntlLocale(i18n.language);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef(null);

  // Default to +15 Days on mount if no value is set
  useEffect(() => {
    if (!value) {
      onChange(addDaysToToday(15));
    }
  }, [value, onChange]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsCalendarOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const todayISO = useMemo(() => addDaysToToday(0), []);

  const activeTermId = useMemo(() => {
    if (!value) return '15';
    const match = QUICK_TERMS.find((t) => addDaysToToday(t.days) === value);
    return match ? match.id : 'custom';
  }, [value]);

  const humanSummary = useMemo(() => {
    if (!value) return t('dueDate.selectDueDate');
    const selected = new Date(`${value}T00:00:00`);
    const today = new Date(`${todayISO}T00:00:00`);
    const diffDays = Math.round((selected - today) / (1000 * 60 * 60 * 24));
    const formatted = selected.toLocaleDateString(intlLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (diffDays === 0) return `${formatted} · ${t('dueDate.dueToday')}`;
    if (diffDays === 1) return `${formatted} · ${t('dueDate.tomorrow')}`;
    if (diffDays > 1) return `${formatted} · ${t('dueDate.inDays', { count: diffDays })}`;
    return `${formatted} · ${t('dueDate.daysAgo', { count: Math.abs(diffDays) })}`;
  }, [value, todayISO, intlLocale, t]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toLocalISODate(new Date(year, month, day)));
    }
    return cells;
  }, [viewMonth]);

  const selectTerm = (days) => {
    const nextISO = addDaysToToday(days);
    onChange(nextISO);
    const d = new Date(`${nextISO}T00:00:00`);
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setIsCalendarOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-2.5">
      {/* Connected Quick-Term Segmented Control */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-zinc-100 border border-zinc-300 rounded-md">
        {QUICK_TERMS.map((term) => {
          const isActive = activeTermId === term.id && !isCalendarOpen;
          return (
            <button
              key={term.id}
              type="button"
              onClick={() => selectTerm(term.days)}
              className={`relative py-1.5 px-2 rounded text-[13px] font-semibold transition-colors duration-150 ${
                isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="dueTermPill"
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 bg-zinc-900 rounded"
                />
              )}
              <span className="relative z-10">{t(term.labelKey)}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCalendarOpen((prev) => !prev)}
          className={`relative py-1.5 px-2 rounded text-[13px] font-semibold transition-colors duration-150 ${
            activeTermId === 'custom' || isCalendarOpen
              ? 'text-white'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          {(activeTermId === 'custom' || isCalendarOpen) && (
            <motion.span
              layoutId="dueTermPill"
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-zinc-900 rounded"
            />
          )}
          <span className="relative z-10">{t('dueDate.custom')}</span>
        </button>
      </div>

      {/* Live Human-Readable Date Trigger */}
      <button
        type="button"
        onClick={() => setIsCalendarOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-zinc-300 hover:border-zinc-400 rounded-md text-left transition-colors duration-150"
      >
        <span className="text-[15px] font-medium text-zinc-900 tabular-nums">
          {humanSummary}
        </span>
        <Calendar size={17} className="text-zinc-500 shrink-0" />
      </button>

      {/* Custom Architectural Stone Popover Calendar */}
      <AnimatePresence>
        {isCalendarOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, rotateX: -4 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, rotateX: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 sm:right-auto sm:w-80 z-50 mt-1 bg-white border border-zinc-300 rounded-lg shadow-elevated p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors duration-150"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-display font-bold text-[15px] text-zinc-900">
                {viewMonth.toLocaleDateString(intlLocale, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors duration-150"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {t('dueDate.weekdays', { returnObjects: true }).map((d, idx) => (
                <span key={`${d}-${idx}`} className="text-[13px] font-medium text-zinc-500 py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((iso, idx) => {
                if (!iso) return <div key={`empty-${idx}`} />;
                const dayNum = Number(iso.split('-')[2]);
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setIsCalendarOpen(false);
                    }}
                    className={`h-9 rounded-md text-[14px] tabular-nums font-medium transition-colors duration-150 ${
                      isSelected
                        ? 'bg-zinc-900 text-white font-bold'
                        : isToday
                          ? 'border border-zinc-900 text-zinc-900 font-bold hover:bg-zinc-100'
                          : 'text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
