import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TabId, ToastMessage } from './types';
import { AuthProvider } from './context/AuthContext';
import { FloatingDock } from './components/common/FloatingDock';
import { ToastContainer } from './components/common/Toast';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { HealingMapPage } from './components/map/HealingMapPage';
import { VentPage } from './components/vent/VentPage';
import { AnxietyPage } from './components/anxiety/AnxietyPage';
import { BuddyPage } from './components/buddy/BuddyPage';

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'warm' = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, text, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F2F2F7] text-[#1D1D1F]">
      <ToastContainer toasts={toasts} />

      <main className="w-full h-full">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
              transition={{ duration: 0.2 }}
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
              transition={{ duration: 0.2 }}
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
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <BuddyPage onShowToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <FloatingDock activeTab={activeTab} onChange={setActiveTab} />

      {/* 小红书式非强制邮箱登录 Sheet + 个人资料 Sheet（已预留微信一键登录与头像昵称同步接口） */}
      <AuthModal onShowToast={showToast} />
      <ProfileModal onShowToast={showToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
