import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, ShieldOff, Sparkles } from 'lucide-react';
import { VentBubble } from '../../types';
import {
  detectHighRiskEmotion,
  QUICK_VENT_TAGS,
  ventService,
} from '../../services/ventService';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { AccountPill } from '../common/AccountPill';
import { HoldToShoutButton } from './HoldToShoutButton';
import { VortexShredder } from './VortexShredder';
import { CareCard } from './CareCard';
import { ResonanceBubble } from './ResonanceBubble';

interface VentPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const VentPage: React.FC<VentPageProps> = ({ onShowToast }) => {
  const { requireAuth } = useAuth();
  const [ventText, setVentText] = useState('');
  const [isShredding, setIsShredding] = useState(false);
  const [shredSnapshot, setShredSnapshot] = useState('');
  const [shredCount, setShredCount] = useState(0);
  const [showCareCard, setShowCareCard] = useState(false);
  const [bubbles, setBubbles] = useState<VentBubble[]>(() =>
    ventService.getBubbles()
  );

  const handleShred = () => {
    const trimmed = ventText.trim();
    if (!trimmed || isShredding) return;

    const isHighRisk = detectHighRiskEmotion(trimmed);
    setShredSnapshot(trimmed);
    setIsShredding(true);

    soundEngine.playShredAndVortex();
    triggerHaptic([35, 30, 85]);

    window.setTimeout(() => {
      setIsShredding(false);
      setVentText('');
      setShredCount((c) => c + 1);

      if (isHighRisk) {
        setShowCareCard(true);
      } else {
        onShowToast('情绪已彻底粉碎归零，深吸一口气，此刻属于你自己 🌿', 'warm');
      }
    }, 1300);
  };

  const handleShoutComplete = (intensity: number) => {
    const label =
      intensity > 0.75
        ? '满格声波已排空！肩颈稍微放松下来了吗？'
        : '收到这声长叹，压抑感已散入五合晚风里～';
    onShowToast(label, 'warm');
  };

  const handleHugComplete = (bubbleId: string) => {
    requireAuth('给同校泡泡送出抱抱', () => {
      const target = bubbles.find((b) => b.id === bubbleId);
      if (target && !target.huggedByMe) {
        setBubbles(ventService.toggleHug(bubbleId));
      }
      onShowToast('这份满格的暖心抱抱已传递给同校同学 🫂', 'warm');
    });
  };

  const handleEmpathyTap = (bubbleId: string) => {
    requireAuth('点亮情绪同感', () => {
      setBubbles(ventService.toggleEmpathy(bubbleId));
    });
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar ios-canvas">
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-32 space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-0.5">
              Instant Vent · 阅后即焚
            </p>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#1D1D1F] tracking-tight leading-tight">
              情绪粉碎机
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              把崩溃丢进黑洞，清空后绝不留任何记录。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {shredCount > 0 && (
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-slate-700 shadow-sm">
                已清空 {shredCount} 次
              </span>
            )}
            <AccountPill />
          </div>
        </header>

        <section className="ios-card rounded-[28px] p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_VENT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setVentText((prev) =>
                    prev.trim() ? `${prev.trim()}，${tag}` : `${tag}！`
                  );
                  triggerHaptic(10);
                }}
                className="px-3 py-1 rounded-full text-[11.5px] font-medium bg-[#F2F2F7] hover:bg-slate-200/80 text-slate-700 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={ventText}
              onChange={(e) => setVentText(e.target.value)}
              placeholder="写下让你崩溃的事… 点粉碎后直接吸入黑洞，本地零留存。"
              className="w-full rounded-[20px] bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white p-4 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed transition-all"
            />
            <span className="absolute bottom-3 right-4 text-[10.5px] text-slate-400">
              不上传 · 阅后即焚
            </span>
          </div>

          <HoldToShoutButton onShoutComplete={handleShoutComplete} />

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            disabled={!ventText.trim() || isShredding}
            onClick={handleShred}
            className="w-full py-3.5 rounded-full bg-[#1D1D1F] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_10px_26px_rgba(15,23,42,0.18)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Flame className="w-4 h-4 text-[#FF9500] fill-[#FF9500]" />
            彻底粉碎（吸入黑洞）
          </motion.button>
        </section>

        <CareCard
          visible={showCareCard}
          onDismiss={() => setShowCareCard(false)}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-[17px] font-bold text-[#1D1D1F] flex items-center gap-1.5 tracking-tight">
                <Sparkles className="w-4 h-4 text-[#007AFF]" />
                同校悬浮共鸣泡泡
              </h2>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                长按任意泡泡蓄满暖光送出抱抱，绝无评论区打扰
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[10.5px] font-medium text-slate-500 shadow-sm shrink-0">
              <ShieldOff className="w-3 h-3 text-[#34C759]" />
              关闭评论区
            </span>
          </div>

          <div className="space-y-4">
            {bubbles.map((bubble, idx) => (
              <ResonanceBubble
                key={bubble.id}
                bubble={bubble}
                index={idx}
                onHugComplete={handleHugComplete}
                onEmpathyTap={handleEmpathyTap}
              />
            ))}
          </div>
        </section>
      </div>

      <VortexShredder active={isShredding} shreddingText={shredSnapshot} />
    </div>
  );
};
