import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Heart, Sparkles } from 'lucide-react';
import { ToastMessage } from '../../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none w-[92%] max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 440, damping: 30 }}
            className="liquid-glass-elevated px-4 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-[13px] text-[#1D1D1F]"
          >
            {toast.type === 'warm' ? (
              <Heart className="w-4 h-4 text-[#FF9500] shrink-0" />
            ) : toast.type === 'info' ? (
              <Sparkles className="w-4 h-4 text-[#007AFF] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
            )}
            <span className="leading-snug font-medium">{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
