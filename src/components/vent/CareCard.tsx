import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarHeart, CheckCircle2, HeartHandshake, Phone, X } from 'lucide-react';

interface CareCardProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * 隐形心理安全兜底卡片：
 * 绝不用红字弹窗惊吓用户，而是以柔和琥珀暖光浮现，提供校园 24h 匿名绿色预约通道与全国援助热线
 */
export const CareCard: React.FC<CareCardProps> = ({ visible, onDismiss }) => {
  const [booked, setBooked] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-emerald-500/10 p-5 shadow-[0_0_40px_rgba(251,191,36,0.16)]"
        >
          {/* 柔和暖光晕 */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-300/20 blur-3xl" />

          <button
            type="button"
            onClick={onDismiss}
            aria-label="收起关怀卡片"
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-300/35 flex items-center justify-center text-amber-200">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-100">
                  刚刚那段情绪一定让你背负了很久吧
                </h3>
                <p className="text-[11px] text-amber-200/75">
                  你不需要一个人硬扛，如果愿意，这里有一盏一直亮着的灯
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-200/90 leading-relaxed">
              文字已经彻底粉碎、不会留下任何记录。但此刻如果你觉得呼吸有点沉重，可以随时选择完全匿名、不通知家长/辅导员的温柔支持通道：
            </p>

            {/* 校园心理中心 24h 匿名绿色预约通道 */}
            <div className="rounded-2xl bg-slate-950/60 border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CalendarHeart className="w-4 h-4" />
                  校园心理中心 · 24h 匿名绿色预约通道
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  仅使用随机代号沟通 · 严格保密协议 · 支持纯文字倾诉
                </p>
              </div>

              {booked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-medium shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已生成匿名通道号 #PAU-24H
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setBooked(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/40 text-emerald-200 text-xs font-medium transition-colors shrink-0"
                >
                  一键匿名预约
                </button>
              )}
            </div>

            {/* 全国心理援助热线 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <a
                href="tel:4001619995"
                className="flex items-center justify-between rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3.5 py-2.5 transition-colors"
              >
                <div>
                  <div className="font-medium text-amber-100">希望 24 热线</div>
                  <div className="text-[11px] text-slate-400">全天候免费倾听</div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-amber-300 font-semibold">
                  <Phone className="w-3.5 h-3.5" />
                  400-161-9995
                </span>
              </a>

              <a
                href="tel:12356"
                className="flex items-center justify-between rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3.5 py-2.5 transition-colors"
              >
                <div>
                  <div className="font-medium text-amber-100">全国心理援助热线</div>
                  <div className="text-[11px] text-slate-400">24 小时公益专线</div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-amber-300 font-semibold">
                  <Phone className="w-3.5 h-3.5" />
                  12356
                </span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
