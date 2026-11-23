import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
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
    color: ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'][i % 5],
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
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {step && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.22)] text-center"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭计时器"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              10 分钟微行动专注舱
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] px-4 tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed px-2">
              {step.detail}
            </p>

            <div className="relative my-6 flex items-center justify-center">
              <svg className="w-48 h-48 -rotate-90" viewBox="0 0 210 210">
                <circle
                  cx="105"
                  cy="105"
                  r={radius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="10"
                />
                <circle
                  cx="105"
                  cy="105"
                  r={radius}
                  fill="none"
                  stroke={celebrating ? '#34C759' : '#007AFF'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={celebrating ? 0 : dashOffset}
                  className="transition-all duration-500"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {celebrating ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#34C759] text-white flex items-center justify-center shadow-md mb-2">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-[#34C759]">
                      微行动完成！
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      你已经打败了启动阻力 ✨
                    </span>
                  </motion.div>
                ) : (
                  <>
                    <span className="text-4xl font-bold font-mono tracking-wider text-[#1D1D1F]">
                      {mins}:{secs}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {running ? '只管做这一小步' : '已暂停呼吸一下'}
                    </span>
                  </>
                )}
              </div>

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
                    }}
                    className="absolute rounded-full pointer-events-none"
                  />
                ))}
            </div>

            {celebrating ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-full bg-[#34C759] hover:bg-emerald-600 text-white font-semibold text-sm shadow-sm"
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
                    className="w-11 h-11 rounded-full bg-[#F2F2F7] hover:bg-slate-200 flex items-center justify-center text-slate-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRunning((r) => !r)}
                    className="px-7 py-3 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-sm flex items-center gap-2 shadow-[0_8px_20px_rgba(0,122,255,0.28)] transition-colors"
                  >
                    {running ? (
                      <>
                        <Pause className="w-4 h-4 fill-white" />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        继续
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={triggerFinish}
                    className="px-3.5 h-11 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#34C759] text-xs font-semibold flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    已完成
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTotalSeconds(5);
                    setRemaining(5);
                    setRunning(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FastForward className="w-3 h-3" />
                  演示快捷：切换为 5 秒极速倒计时体验烟花
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
