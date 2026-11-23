import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { soundEngine, triggerHaptic } from '../../utils/audio';

interface HoldToShoutButtonProps {
  onShoutComplete: (intensity: number) => void;
}

const BAR_COUNT = 18;

export const HoldToShoutButton: React.FC<HoldToShoutButtonProps> = ({
  onShoutComplete,
}) => {
  const [holding, setHolding] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<number | null>(null);
  const intensityRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startHold = () => {
    setHolding(true);
    intensityRef.current = 0.15;
    setIntensity(0.15);
    triggerHaptic(20);

    timerRef.current = window.setInterval(() => {
      intensityRef.current = Math.min(1, intensityRef.current + 0.055);
      setIntensity(intensityRef.current);
      setTick((t) => t + 1);
      if (Math.random() > 0.65) {
        triggerHaptic(12);
      }
    }, 65);
  };

  const endHold = () => {
    if (!holding) return;
    setHolding(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalLevel = intensityRef.current;
    soundEngine.playShoutRelease(finalLevel);
    triggerHaptic([25, 25, 50]);
    onShoutComplete(finalLevel);
    setIntensity(0);
  };

  const dbDisplay = Math.round(45 + intensity * 68);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 select-none touch-none transition-all ${
          holding
            ? 'bg-amber-400/20 border-amber-300/60 shadow-glow-amber scale-[0.99]'
            : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/10'
        }`}
      >
        {/* 进度光晕底色 */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400/25 via-rose-400/20 to-violet-400/25 transition-all duration-75 pointer-events-none"
          style={{ width: `${Math.round(intensity * 100)}%` }}
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={holding ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ repeat: holding ? Infinity : 0, duration: 0.45 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                holding
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
              }`}
            >
              <Mic className="w-4 h-4" />
            </motion.div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-medium text-white">
                {holding ? '正在无声呐喊中…松手释放' : '按住「吼一嗓子」'}
              </div>
              <div className="text-[11px] text-slate-400">
                {holding
                  ? `模拟声压 ${dbDisplay} dB · 不录音不上传`
                  : '在宿舍/图书馆也能模拟发泄的静音声波按钮'}
              </div>
            </div>
          </div>

          {/* 实时动态声波条 */}
          <div className="flex items-center gap-[3px] h-7">
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const wave = holding
                ? Math.max(
                    0.2,
                    Math.abs(Math.sin(tick * 0.7 + i * 0.55)) *
                      (0.4 + intensity * 0.8)
                  )
                : 0.16 + (i % 3) * 0.06;
              return (
                <span
                  key={i}
                  className={`w-[3px] rounded-full transition-all duration-75 ${
                    holding ? 'bg-amber-300' : 'bg-slate-600'
                  }`}
                  style={{ height: `${Math.round(wave * 26)}px` }}
                />
              );
            })}
          </div>
        </div>
      </button>
    </div>
  );
};
