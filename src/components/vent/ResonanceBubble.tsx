import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { VentBubble } from '../../types';
import { soundEngine, triggerHaptic } from '../../utils/audio';

interface ResonanceBubbleProps {
  bubble: VentBubble;
  index: number;
  onHugComplete: (id: string) => void;
  onEmpathyTap: (id: string) => void;
}

interface MicroDroplet {
  id: string;
  x: number;
  y: number;
  size: number;
  emoji?: string;
}

const TONE_TINT: Record<VentBubble['tone'], string> = {
  mint: 'rgba(52, 199, 89, 0.16)',
  amber: 'rgba(255, 149, 0, 0.16)',
  lavender: 'rgba(175, 82, 222, 0.15)',
};

export const ResonanceBubble: React.FC<ResonanceBubbleProps> = ({
  bubble,
  index,
  onHugComplete,
  onEmpathyTap,
}) => {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [droplets, setDroplets] = useState<MicroDroplet[]>([]);

  const intervalRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const spawnDroplets = (count: number, emoji?: string) => {
    const batch: MicroDroplet[] = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 48 + Math.random() * 42;
      return {
        id: `${Date.now()}-${i}-${Math.random()}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 16,
        size: 8 + (i % 3) * 4,
        emoji: i % 3 === 0 ? emoji : undefined,
      };
    });
    setDroplets((prev) => [...prev, ...batch]);
    window.setTimeout(() => {
      setDroplets((prev) =>
        prev.filter((d) => !batch.some((b) => b.id === d.id))
      );
    }, 950);
  };

  const startHoldHug = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-empathy-btn="true"]')) return;

    setIsHolding(true);
    setHintText(null);
    completedRef.current = false;
    progressRef.current = 0.08;
    setHoldProgress(0.08);
    triggerHaptic(12);

    intervalRef.current = window.setInterval(() => {
      progressRef.current = Math.min(1, progressRef.current + 0.085);
      setHoldProgress(progressRef.current);

      if (progressRef.current >= 1 && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsHolding(false);
        setBursting(true);
        soundEngine.playCelebrationChime();
        triggerHaptic([22, 24, 48]);
        spawnDroplets(12, '🫂');
        onHugComplete(bubble.id);

        window.setTimeout(() => {
          setBursting(false);
          setHoldProgress(0);
        }, 680);
      }
    }, 48);
  };

  const endHoldHug = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!completedRef.current && isHolding) {
      soundEngine.playPop(520);
      setHintText('长按泡泡蓄满暖光，送出温暖抱抱 🫂');
      window.setTimeout(() => setHintText(null), 1800);
    }
    setIsHolding(false);
    if (!completedRef.current) setHoldProgress(0);
  };

  const handleEmpathyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRippleKey((k) => k + 1);
    soundEngine.playPop(680);
    triggerHaptic(16);
    spawnDroplets(6, '⚡');
    onEmpathyTap(bubble.id);
  };

  return (
    <motion.div
      layout
      style={{ animationDelay: `${(index % 4) * 0.75}s` }}
      className="animate-bubble-float relative"
    >
      <motion.div
        onPointerDown={startHoldHug}
        onPointerUp={endHoldHug}
        onPointerLeave={endHoldHug}
        onPointerCancel={endHoldHug}
        animate={{
          scale: bursting ? 1.045 : isHolding ? 1 + holdProgress * 0.04 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        className="soap-bubble rounded-[36px] p-5 sm:p-6 cursor-pointer select-none touch-pan-y overflow-hidden"
      >
        {/* 长按蓄力虹彩暖光层 */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: isHolding || bursting ? 1 : 0,
            background: `radial-gradient(circle at 50% 50%, ${TONE_TINT[bubble.tone]} 0%, transparent ${Math.round(
              28 + holdProgress * 82
            )}%)`,
          }}
        />

        {/* 同感点击扩散水波纹 */}
        <AnimatePresence>
          {rippleKey > 0 && (
            <motion.span
              key={rippleKey}
              initial={{ scale: 0.2, opacity: 0.5 }}
              animate={{ scale: 2.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-[#007AFF]/35"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
          <span className="px-3 py-0.5 rounded-full bg-white/90 border border-slate-200/70 text-[11px] font-semibold text-slate-700 shadow-sm">
            #{bubble.tag}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            五合匿名泡泡 · {bubble.createdAt}
          </span>
        </div>

        <p className="relative z-10 text-[14.5px] text-[#1D1D1F] leading-[1.68] tracking-tight">
          {bubble.content}
        </p>

        {/* 蓄力进度细光条 */}
        <div className="relative z-10 mt-3.5 h-[3.5px] w-full rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#007AFF] via-[#34C759] to-[#FF9500] transition-all duration-75"
            style={{ width: `${Math.round(holdProgress * 100)}%` }}
          />
        </div>

        <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isHolding || bubble.huggedByMe
                  ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                  : 'bg-white/90 text-slate-700 border-slate-200/80'
              }`}
            >
              <span>🫂</span>
              <span>
                {isHolding
                  ? `蓄力抱抱 ${Math.round(holdProgress * 100)}%`
                  : bubble.huggedByMe
                  ? '已送出抱抱'
                  : '长按泡泡抱抱'}
              </span>
              <span className="font-mono text-[11px] opacity-85">
                {bubble.hugs}
              </span>
            </div>

            <motion.button
              type="button"
              data-empathy-btn="true"
              whileTap={{ scale: 0.9 }}
              onClick={handleEmpathyClick}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                bubble.empathizedByMe
                  ? 'bg-amber-50 text-[#FF9500] border-amber-200'
                  : 'bg-white/90 text-slate-600 border-slate-200/80 hover:bg-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#FF9500]" />
              <span>同感</span>
              <span className="font-mono text-[11px] opacity-85">
                {bubble.empathy}
              </span>
            </motion.button>
          </div>

          <Sparkles className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
        </div>

        <AnimatePresence>
          {hintText && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="relative z-10 mt-2 text-[11.5px] font-medium text-[#007AFF]"
            >
              {hintText}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 绽放飘散的虹彩微泡泡粒子 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-20">
        <AnimatePresence>
          {droplets.map((d) => (
            <motion.span
              key={d.id}
              initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
              animate={{ x: d.x, y: d.y - 24, scale: 1.15, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              className="absolute flex items-center justify-center"
            >
              {d.emoji ? (
                <span className="text-base">{d.emoji}</span>
              ) : (
                <span
                  style={{ width: d.size, height: d.size }}
                  className="rounded-full bg-white/90 border border-[#007AFF]/35 shadow-sm"
                />
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
