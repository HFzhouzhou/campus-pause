import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock,
  KeyRound,
  MapPin,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { BuddyActivity } from '../../types';
import { QUICK_CIPHER_MESSAGES } from '../../services/buddyService';

interface BuddyCipherModalProps {
  buddy: BuddyActivity | null;
  remainingText: string;
  onClose: () => void;
  onSendQuickMessage: (buddyId: string, text: string) => void;
  onLeave: (buddyId: string) => void;
}

export const BuddyCipherModal: React.FC<BuddyCipherModalProps> = ({
  buddy,
  remainingText,
  onClose,
  onSendQuickMessage,
  onLeave,
}) => {
  const [customMsg, setCustomMsg] = useState('');

  const handleSend = (text: string) => {
    if (!buddy || !text.trim()) return;
    onSendQuickMessage(buddy.id, text.trim());
    setCustomMsg('');
  };

  return (
    <AnimatePresence>
      {buddy && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 w-auto sm:w-full max-w-md max-h-[86vh] flex flex-col rounded-3xl bg-[#0F1626] border border-white/15 shadow-2xl overflow-hidden"
          >
            {/* 头部 */}
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[11px] font-medium mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  已举手加入 · 临时暗号频道
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {buddy.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* 集合暗号卡片 */}
              <div className="rounded-2xl bg-gradient-to-br from-sky-500/15 via-slate-900/90 to-emerald-500/10 border border-sky-400/30 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-200">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <KeyRound className="w-4 h-4" />
                    接头暗号 / 辨认特征
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-300">
                    <Clock className="w-3 h-3" />
                    剩余 {remainingText}
                  </span>
                </div>
                <p className="text-base font-bold text-white">
                  “{buddy.cipher}”
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {buddy.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-sky-300" />
                    {buddy.joinedCount}/{buddy.maxPeople} 人
                  </span>
                </div>
              </div>

              {/* 边界声明 */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-[11px] text-slate-300 text-center">
                🫧 {buddy.boundaryTag} · 倒计时结束自动销毁聊天记录
              </div>

              {/* 临时轻聊流 */}
              <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {buddy.quickMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3.5 py-2.5 text-xs ${
                      m.sender.startsWith('我')
                        ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 ml-8'
                        : 'bg-white/[0.05] border border-white/10 text-slate-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>{m.sender}</span>
                      <span>{m.time}</span>
                    </div>
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* 零压力快捷短语 */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CIPHER_MESSAGES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSend(phrase)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.05] hover:bg-sky-500/20 text-slate-300 hover:text-sky-200 border border-white/10 transition-colors"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* 输入一句短消息 */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(customMsg);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="发一句简短位置确认…"
                  className="flex-1 rounded-xl bg-slate-950/75 border border-white/12 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/50"
                />
                <button
                  type="submit"
                  disabled={!customMsg.trim()}
                  className="p-2.5 rounded-xl bg-sky-400/20 hover:bg-sky-400/30 text-sky-200 border border-sky-400/40 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => onLeave(buddy.id)}
                className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                临时有事，悄悄退出本次搭子
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
