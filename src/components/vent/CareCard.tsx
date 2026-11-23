import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarHeart,
  CheckCircle2,
  HeartHandshake,
  Phone,
  X,
} from 'lucide-react';

interface CareCardProps {
  visible: boolean;
  onDismiss: () => void;
}

export const CareCard: React.FC<CareCardProps> = ({ visible, onDismiss }) => {
  const [booked, setBooked] = useState(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[28px] border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-emerald-50/70 p-5 shadow-[0_14px_38px_-12px_rgba(251,191,36,0.28)]"
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="收起关怀卡片"
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center gap-2.5 pr-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#FF9500] flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">
                  刚刚那段情绪一定让你背负了很久吧
                </h3>
                <p className="text-[11.5px] text-amber-700/85">
                  你不需要一个人硬扛，这里有一盏一直亮着的灯
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              文字已经彻底粉碎、不会留下任何记录。但此刻如果你觉得呼吸有点沉重，可以随时选择完全匿名、不通知家长/辅导员的温柔支持通道：
            </p>

            <div className="rounded-2xl bg-white/90 border border-slate-200/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#34C759] flex items-center gap-1.5">
                  <CalendarHeart className="w-4 h-4" />
                  校园心理中心 · 24h 匿名绿色预约通道
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  仅使用随机代号沟通 · 严格保密 · 支持纯文字倾诉
                </p>
              </div>

              {booked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  通道号 #PAU-24H
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setBooked(true)}
                  className="px-3.5 py-2 rounded-full bg-[#34C759] hover:bg-emerald-600 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  一键匿名预约
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <a
                href="tel:4001619995"
                className="flex items-center justify-between rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 px-3.5 py-2.5 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[#1D1D1F]">希望 24 热线</div>
                  <div className="text-[11px] text-slate-500">全天候免费倾听</div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[#FF9500] font-bold">
                  <Phone className="w-3.5 h-3.5" />
                  400-161-9995
                </span>
              </a>

              <a
                href="tel:12356"
                className="flex items-center justify-between rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 px-3.5 py-2.5 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[#1D1D1F]">全国心理援助热线</div>
                  <div className="text-[11px] text-slate-500">24 小时公益专线</div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[#FF9500] font-bold">
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
