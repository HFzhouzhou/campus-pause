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

const TONE_GLOW: Record<VentBubble['tone'], string> = {
  mint: 'rgba(52, 211, 153, 0.24)',
  amber: 'rgba(251, 191, 36, 0.24)',
  lavender: 'rgba(167, 139, 250, 0.26)',
};

/**
 * 真正的通透液态玻璃悬浮泡泡：
 * - 表面有高光折射弧与虹彩边缘，缓慢悬浮呼吸
 * - 不是干巴巴点一下就结束：支持「长按泡泡蓄力抱抱（膨胀+进度光环+满格绽放微泡）」与「点击触发同感水波纹」
 */
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
      const dist = 48 + Math.random() * 44;
      return {
        id: `${Date.now()}-${i}-${Math.random()}`,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 18,
        size: 7 + (i % 3) * 4,
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
    // 忽略点击同感按钮时的冒泡
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
      // 轻点了一下：给予 Q 弹反馈并温柔提示长按抱抱
      soundEngine.playPop(520);
      setHintText('长按泡泡蓄满光环，送出温暖抱抱 🫂');
      window.setTimeout(() => setHintText(null), 1800);
    }
    setIsHolding(false);
    if (!completedRef.current) {
      setHoldProgress(0);
    }
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
      style={{
        animationDelay: `${(index % 4) * 0.7}s`,
      }}
      className="animate-bubble-float relative"
    >
      <motion.div
        onPointerDown={startHoldHug}
        onPointerUp={endHoldHug}
        onPointerLeave={endHoldHug}
        onPointerCancel={endHoldHug}
        animate={{
          scale: bursting ? 1.05 : isHolding ? 1 + holdProgress * 0.045 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        className="soap-bubble rounded-[36px] p-5 sm:p-6 border border-white/20 cursor-pointer select-none touch-pan-y overflow-hidden"
        style={{
          boxShadow: isHolding
            ? `inset 0 2px 4px rgba(255,255,255,0.45), 0 0 ${Math.round(
                24 + holdProgress * 36
              )}px ${TONE_GLOW[bubble.tone]}`
            : undefined,
        }}
      >
        {/* 长按蓄力暖光填充层 */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: isHolding || bursting ? 0.9 : 0,
            background: `radial-gradient(circle at 50% 50%, ${TONE_GLOW[bubble.tone]} 0%, transparent ${Math.round(
              25 + holdProgress * 85
            )}%)`,
          }}
        />

        {/* 同感点击扩散水波纹 */}
        <AnimatePresence>
          {rippleKey > 0 && (
            <motion.span
              key={rippleKey}
              initial={{ scale: 0.2, opacity: 0.55 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/40"
            />
          )}
        </AnimatePresence>

        {/* 泡泡顶部标签与时间 */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
          <span className="px-3 py-0.5 rounded-full bg-white/[0.1] border border-white/15 text-[11px] font-medium text-white/90">
            #{bubble.tag}
          </span>
          <span className="text-[11px] text-white/45">
            五合匿名泡泡 · {bubble.createdAt}
          </span>
        </div>

        {/* 情绪文本 */}
        <p className="relative z-10 text-[14px] text-white/90 leading-[1.65] tracking-tight">
          {bubble.content}
        </p>

        {/* 蓄力进度细光条 */}
        <div className="relative z-10 mt-3.5 h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-violet-300 transition-all duration-75"
            style={{ width: `${Math.round(holdProgress * 100)}%` }}
          />
        </div>

        {/* 底部交互区：长按抱抱 + 点击同感（无评论区） */}
        <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isHolding || bubble.huggedByMe
                  ? 'bg-white/20 text-white border-white/35 shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                  : 'bg-white/[0.07] text-white/80 border-white/12'
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
              <span className="font-mono text-[11px] text-white/75">
                {bubble.hugs}
              </span>
            </div>

            <motion.button
              type="button"
              data-empathy-btn="true"
              whileTap={{ scale: 0.9 }}
              onClick={handleEmpathyClick}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                bubble.empathizedByMe
                  ? 'bg-amber-300/20 text-amber-100 border-amber-200/40'
                  : 'bg-white/[0.07] text-white/75 border-white/12 hover:bg-white/[0.14]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>同感</span>
              <span className="font-mono text-[11px] opacity-85">
                {bubble.empathy}
              </span>
            </motion.button>
          </div>

          <Sparkles className="w-4 h-4 text-white/30 shrink-0 hidden sm:block" />
        </div>

        {/* 轻点引导气泡提示 */}
        <AnimatePresence>
          {hintText && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="relative z-10 mt-2 text-[11px] text-amber-200/90"
            >
              {hintText}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 绽放飘散的微液态泡泡粒子 */}
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
                  className="rounded-full bg-white/40 border border-white/70 shadow-[0_0_10px_rgba(255,255,255,0.65)]"
                />
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
