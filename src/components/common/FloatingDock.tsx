import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Flame, Sparkles, Users } from 'lucide-react';
import { TabId } from '../../types';

interface FloatingDockProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const NAV_ITEMS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { id: 'map', label: '治愈地图', icon: Compass, accent: 'text-emerald-300' },
  { id: 'vent', label: '情绪粉碎', icon: Flame, accent: 'text-amber-300' },
  { id: 'anxiety', label: '焦虑拆解', icon: Sparkles, accent: 'text-violet-300' },
  { id: 'buddy', label: '限时搭子', icon: Users, accent: 'text-sky-300' },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  onChange,
}) => {
  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none pb-safe">
      <nav
        aria-label="主导航"
        className="pointer-events-auto hud-glass-strong rounded-full px-2 py-1.5 shadow-glass flex items-center gap-1 max-w-md w-full justify-between"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-2.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="floating-dock-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-white/12 border border-white/15 shadow-[0_0_20px_rgba(52,211,153,0.18)]"
                />
              )}
              <Icon
                className={`relative z-10 w-4 h-4 transition-transform ${
                  isActive ? `${item.accent} scale-110` : ''
                }`}
              />
              <span className="relative z-10 whitespace-nowrap tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
