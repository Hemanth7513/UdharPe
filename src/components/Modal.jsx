import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md z-10"
          >
            <div className="bg-white rounded-lg shadow-elevated p-6 sm:p-7 border border-zinc-300">
              <div className="flex justify-between items-center pb-4 mb-5 border-b border-zinc-200">
                <h2 className="text-xl font-display font-bold text-zinc-900 tracking-tight">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-md border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors duration-150"
                >
                  <X size={16} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
