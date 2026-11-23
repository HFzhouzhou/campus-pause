import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Heart, Sparkles } from 'lucide-react';
import { ToastMessage } from '../../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none w-[90%] max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="hud-glass-strong px-4 py-2.5 rounded-full shadow-glass flex items-center gap-2 text-xs sm:text-sm text-slate-100 border border-white/15"
          >
            {toast.type === 'warm' ? (
              <Heart className="w-4 h-4 text-amber-300 shrink-0" />
            ) : toast.type === 'info' ? (
              <Sparkles className="w-4 h-4 text-violet-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="leading-snug">{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
