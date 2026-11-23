import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface VortexShredderProps {
  active: boolean;
  shreddingText: string;
}

const PARTICLES = Array.from({ length: 22 }).map((_, i) => {
  const angle = (i / 22) * Math.PI * 2;
  const radius = 115 + (i % 4) * 28;
  return {
    id: i,
    startX: Math.cos(angle) * radius,
    startY: Math.sin(angle) * radius,
    size: 4 + (i % 4) * 2,
    color: i % 3 === 0 ? '#A78BFA' : i % 3 === 1 ? '#FBBF24' : '#34D399',
    delay: (i % 6) * 0.04,
  };
});

/**
 * 黑洞漩涡情绪粉碎动效：卡片揉皱撕裂并高速旋转吸入黑洞，随后粒子坍缩归零
 */
export const VortexShredder: React.FC<VortexShredderProps> = ({
  active,
  shreddingText,
}) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#060911]/85 backdrop-blur-md px-4"
        >
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* 外圈旋转星云吸积盘 */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: 0 }}
              animate={{ scale: [0.5, 1.15, 0.92, 0.2], opacity: [0, 1, 0.9, 0], rotate: 540 }}
              transition={{ duration: 1.35, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-violet-400/50"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(167,139,250,0.35), rgba(52,211,153,0.18), rgba(251,191,36,0.28), rgba(167,139,250,0.35))',
                filter: 'blur(6px)',
              }}
            />

            {/* 黑洞核心 */}
            <motion.div
              initial={{ scale: 0.2 }}
              animate={{ scale: [0.2, 1.05, 1.25, 0] }}
              transition={{ duration: 1.35, ease: 'easeInOut' }}
              className="absolute w-24 h-24 rounded-full bg-black border border-violet-300/60 shadow-[0_0_50px_rgba(167,139,250,0.85)]"
            />

            {/* 被揉皱、撕裂并旋涡吸入的文字卡片 */}
            <motion.div
              initial={{ scale: 1, rotate: 0, opacity: 1, borderRadius: '18px' }}
              animate={{
                scale: [1, 0.92, 0.55, 0.14, 0],
                rotate: [0, -8, 120, 420, 720],
                skewX: [0, 12, -24, 30, 0],
                opacity: [1, 1, 0.85, 0.4, 0],
                borderRadius: ['18px', '32px', '50%', '50%', '50%'],
              }}
              transition={{ duration: 1.15, ease: [0.55, 0.06, 0.68, 0.19] }}
              className="relative z-10 w-60 p-4 bg-slate-900/95 border border-amber-300/40 text-xs text-slate-200 text-center shadow-2xl line-clamp-4"
            >
              {shreddingText || '所有的委屈与压力，此刻归零'}
            </motion.div>

            {/* 向中心坍缩的碎片粒子 */}
            {PARTICLES.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 1.2 }}
                animate={{
                  x: [p.startX, p.startX * 0.4, 0],
                  y: [p.startY, p.startY * 0.4, 0],
                  opacity: [0, 1, 0],
                  scale: [1.2, 0.8, 0],
                }}
                transition={{
                  duration: 1.05,
                  delay: p.delay,
                  ease: 'easeIn',
                }}
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 10px ${p.color}`,
                }}
                className="absolute rounded-full pointer-events-none"
              />
            ))}

            {/* 底部轻提示 */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: [0, 1, 1, 0], y: 0 }}
              transition={{ duration: 1.3 }}
              className="absolute -bottom-10 text-xs tracking-wider text-violet-200 whitespace-nowrap"
            >
              正在粉碎并彻底清空，不留任何记录…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
