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
import { HoldToShoutButton } from './HoldToShoutButton';
import { VortexShredder } from './VortexShredder';
import { CareCard } from './CareCard';
import { ResonanceBubble } from './ResonanceBubble';

interface VentPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const VentPage: React.FC<VentPageProps> = ({ onShowToast }) => {
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
    const target = bubbles.find((b) => b.id === bubbleId);
    if (target && !target.huggedByMe) {
      setBubbles(ventService.toggleHug(bubbleId));
    }
    onShowToast('这份满格的暖心抱抱已传递给同校同学 🫂', 'warm');
  };

  const handleEmpathyTap = (bubbleId: string) => {
    setBubbles(ventService.toggleEmpathy(bubbleId));
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#06080f]">
      {/* 柔和苹果氛围光球 */}
      <div className="pointer-events-none fixed -top-28 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-20 -right-24 w-96 h-96 rounded-full bg-violet-500/12 blur-[130px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-7 pb-32 space-y-7">
        {/* Apple 极简大标题 */}
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-1">
              Instant Vent · 阅后即焚
            </p>
            <h1 className="text-[26px] sm:text-3xl font-bold text-white tracking-tight leading-tight">
              情绪粉碎机
            </h1>
            <p className="text-xs sm:text-sm text-white/55 mt-1">
              把崩溃丢进黑洞，清空后绝不留任何记录。
            </p>
          </div>
          {shredCount > 0 && (
            <div className="liquid-glass rounded-full px-3.5 py-1.5 text-xs text-white/90 shrink-0">
              已清空 <span className="font-semibold text-emerald-300">{shredCount}</span> 次
            </div>
          )}
        </header>

        {/* 液态玻璃宣泄卡片 */}
        <section className="liquid-glass rounded-[30px] p-5 space-y-4">
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
                className="px-3 py-1 rounded-full text-[11.5px] bg-white/[0.07] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/10 transition-colors"
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
              className="w-full rounded-[22px] bg-black/35 border border-white/12 p-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35 resize-none leading-relaxed"
            />
            <span className="absolute bottom-3 right-4 text-[10.5px] text-white/35">
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
            className="w-full py-3.5 rounded-full bg-white text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.18)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            彻底粉碎（吸入黑洞）
          </motion.button>
        </section>

        {/* 隐形心理安全兜底 */}
        <CareCard
          visible={showCareCard}
          onDismiss={() => setShowCareCard(false)}
        />

        {/* 同校共鸣泡泡池 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-1.5 tracking-tight">
                <Sparkles className="w-4 h-4 text-white/80" />
                同校悬浮共鸣泡泡
              </h2>
              <p className="text-[11.5px] text-white/50 mt-0.5">
                长按任意泡泡蓄满暖光送出抱抱，绝无评论区打扰
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-glass text-[10.5px] text-white/65 shrink-0">
              <ShieldOff className="w-3 h-3 text-emerald-300" />
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
