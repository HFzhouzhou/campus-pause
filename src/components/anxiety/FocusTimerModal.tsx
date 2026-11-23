import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, FastForward, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { MicroStepItem } from '../../types';
import { soundEngine, triggerHaptic } from '../../utils/audio';

interface FocusTimerModalProps {
  step: MicroStepItem | null;
  onClose: () => void;
  onComplete: (stepId: string) => void;
}

const FIREWORK_BURSTS = Array.from({ length: 28 }).map((_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const dist = 75 + (i % 5) * 26;
  return {
    id: i,
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    color: ['#34D399', '#FBBF24', '#A78BFA', '#38BDF8', '#FB7185'][i % 5],
    size: 5 + (i % 3) * 2.5,
  };
});

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  step,
  onClose,
  onComplete,
}) => {
  const DEFAULT_SECONDS = 10 * 60;
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_SECONDS);
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS);
  const [running, setRunning] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (step) {
      const secs = (step.durationMinutes || 10) * 60;
      setTotalSeconds(secs);
      setRemaining(secs);
      setRunning(true);
      setCelebrating(false);
    }
  }, [step]);

  useEffect(() => {
    if (!step || !running || celebrating) return;
    if (remaining <= 0) {
      triggerFinish();
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          triggerFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, running, celebrating]);

  const triggerFinish = () => {
    if (!step || celebrating) return;
    setRunning(false);
    setCelebrating(true);
    soundEngine.playCelebrationChime();
    triggerHaptic([30, 40, 60]);
    onComplete(step.id);
  };

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 1;
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {step && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#050810]/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 max-w-md w-auto sm:w-full rounded-3xl hud-glass-strong border border-white/15 p-6 shadow-2xl text-center overflow-hidden"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭计时器"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/35 text-violet-200 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              10 分钟微行动专注舱
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white px-4">
              {step.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed px-2">
              {step.detail}
            </p>

            {/* 极简圆环倒计时 + 烟花庆祝 */}
            <div className="relative my-6 flex items-center justify-center">
              <svg className="w-52 h-52 -rotate-90" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  fill="none"
                  stroke={celebrating ? '#34D399' : '#A78BFA'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={celebrating ? 0 : dashOffset}
                  className="transition-all duration-500"
                  style={{
                    filter: celebrating
                      ? 'drop-shadow(0 0 14px rgba(52,211,153,0.8))'
                      : 'drop-shadow(0 0 12px rgba(167,139,250,0.6))',
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {celebrating ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-glow-mint mb-2">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-emerald-300">
                      微行动完成！
                    </span>
                    <span className="text-[11px] text-slate-300 mt-0.5">
                      你已经打败了最难的启动阻力 ✨
                    </span>
                  </motion.div>
                ) : (
                  <>
                    <span className="text-4xl font-bold font-mono tracking-wider text-white">
                      {mins}:{secs}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {running ? '只管做这一小步' : '已暂停呼吸一下'}
                    </span>
                  </>
                )}
              </div>

              {/* 烟花粒子绽放 */}
              {celebrating &&
                FIREWORK_BURSTS.map((fw) => (
                  <motion.span
                    key={fw.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                    animate={{
                      x: fw.x,
                      y: fw.y,
                      opacity: [1, 1, 0],
                      scale: [0.6, 1.3, 0.2],
                    }}
                    transition={{ duration: 0.95, ease: 'easeOut' }}
                    style={{
                      width: fw.size,
                      height: fw.size,
                      backgroundColor: fw.color,
                      boxShadow: `0 0 10px ${fw.color}`,
                    }}
                    className="absolute rounded-full pointer-events-none"
                  />
                ))}
            </div>

            {/* 控制栏 */}
            {celebrating ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-semibold text-sm shadow-glow-mint"
              >
                收下这份掌控感，返回下一步
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRemaining(totalSeconds);
                      setRunning(false);
                    }}
                    title="重置"
                    className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRunning((r) => !r)}
                    className="px-7 py-3 rounded-full bg-violet-400 hover:bg-violet-300 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-glow-lavender transition-colors"
                  >
                    {running ? (
                      <>
                        <Pause className="w-4 h-4 fill-slate-950" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        继续
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={triggerFinish}
                    title="提前完成并打钩"
                    className="px-3.5 h-11 rounded-full bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/40 text-emerald-200 text-xs font-medium flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    已完成
                  </button>
                </div>

                {/* 低调演示加速按钮，方便快速体验倒计时结束放烟花 */}
                <button
                  type="button"
                  onClick={() => {
                    setTotalSeconds(5);
                    setRemaining(5);
                    setRunning(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <FastForward className="w-3 h-3" />
                  演示快捷：切换为 5 秒极速倒计时体验烟花
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
