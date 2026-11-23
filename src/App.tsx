import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TabId, ToastMessage } from './types';
import { FloatingDock } from './components/common/FloatingDock';
import { ToastContainer } from './components/common/Toast';
import { HealingMapPage } from './components/map/HealingMapPage';
import { VentPage } from './components/vent/VentPage';
import { AnxietyPage } from './components/anxiety/AnxietyPage';
import { BuddyPage } from './components/buddy/BuddyPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'warm' = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, text, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0F19] text-slate-100">
      <ToastContainer toasts={toasts} />

      <main className="w-full h-full">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <HealingMapPage onShowToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'vent' && (
            <motion.div
              key="vent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <VentPage onShowToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'anxiety' && (
            <motion.div
              key="anxiety"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <AnxietyPage onShowToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'buddy' && (
            <motion.div
              key="buddy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <BuddyPage onShowToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <FloatingDock activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
