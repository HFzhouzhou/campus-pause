import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Flame, Sparkles, Users } from 'lucide-react';
import { TabId } from '../../types';
import { triggerHaptic } from '../../utils/audio';

interface FloatingDockProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const NAV_ITEMS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'map', label: '治愈地图', icon: Compass },
  { id: 'vent', label: '情绪粉碎', icon: Flame },
  { id: 'anxiety', label: '焦虑拆解', icon: Sparkles },
  { id: 'buddy', label: '限时搭子', icon: Users },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className="fixed bottom-3.5 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none pb-safe">
      <nav
        aria-label="主导航"
        className="pointer-events-auto relative liquid-dock rounded-[30px] p-1.5 flex items-center gap-1 max-w-[392px] w-full"
      >
        {/* 顶部液态玻璃折射高光丝带 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[1px] inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                if (activeTab !== item.id) {
                  triggerHaptic(10);
                  onChange(item.id);
                }
              }}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1.5 rounded-[24px] transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-white/55 hover:text-white/85'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="apple-liquid-glass-lens"
                  transition={{
                    type: 'spring',
                    stiffness: 410,
                    damping: 30,
                    mass: 0.85,
                  }}
                  className="absolute inset-0 rounded-[24px] liquid-lens"
                />
              )}
              <Icon
                className={`relative z-10 w-[19px] h-[19px] stroke-[1.9] transition-transform duration-200 ${
                  isActive ? 'scale-105 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]' : ''
                }`}
              />
              <span
                className={`relative z-10 text-[10px] tracking-tight whitespace-nowrap ${
                  isActive ? 'font-semibold text-white' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
