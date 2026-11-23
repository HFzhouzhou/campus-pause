import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock,
  KeyRound,
  LogOut,
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          {/* 苹果 Wallet 凭证 + iMessage 临时频道 Sheet：结构完整永不截断 */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-[460px] max-h-[90dvh] flex flex-col rounded-t-[30px] sm:rounded-[30px] bg-white/96 backdrop-blur-2xl border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
              <div className="w-9 h-1 rounded-full bg-slate-300" />
            </div>

            {/* 固定头部 */}
            <div className="px-5 pt-3.5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#34C759] text-[11px] font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  已举手加入 · 临时暗号频道
                </div>
                <h3 className="text-[16px] font-bold text-[#1D1D1F] leading-snug tracking-tight">
                  {buddy.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭频道"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 中间可滚动区域：暗号卡 + 聊天流 */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {/* Apple Wallet 风格接头暗号卡 */}
              <div className="rounded-[22px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] p-4 text-white shadow-[0_12px_28px_rgba(0,122,255,0.26)] space-y-2.5">
                <div className="flex items-center justify-between text-xs text-white/85">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <KeyRound className="w-3.5 h-3.5" />
                    接头暗号 / 辨认特征
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 font-mono text-[11px] font-semibold">
                    <Clock className="w-3 h-3" />
                    剩 {remainingText}
                  </span>
                </div>

                <p className="text-[17px] font-bold tracking-tight">
                  “{buddy.cipher}”
                </p>

                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11.5px] text-white/90">
                  <span className="flex items-center gap-1 truncate pr-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {buddy.location}
                  </span>
                  <span className="flex items-center gap-1 shrink-0 font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    {buddy.joinedCount}/{buddy.maxPeople} 人
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F2F2F7] px-3.5 py-2 text-[11.5px] text-slate-600 text-center font-medium">
                🫧 {buddy.boundaryTag} · 到点自动销毁临时消息
              </div>

              {/* iMessage 风格气泡流 */}
              <div className="space-y-2.5">
                {buddy.quickMessages.map((m) => {
                  const isMe = m.sender.startsWith('我');
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 px-2 mb-0.5">
                        {m.sender} · {m.time}
                      </span>
                      <div
                        className={`max-w-[82%] rounded-[20px] px-3.5 py-2 text-[13px] leading-relaxed ${
                          isMe
                            ? 'bg-[#007AFF] text-white rounded-br-md'
                            : 'bg-[#F2F2F7] text-[#1D1D1F] rounded-bl-md'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 固定底部快捷短语 + 输入栏 + 退出按钮（永不裁切） */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white/95 space-y-2.5 shrink-0 pb-safe">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_CIPHER_MESSAGES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSend(phrase)}
                    className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium bg-[#F2F2F7] hover:bg-slate-200/80 text-slate-700 transition-colors"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

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
                  className="flex-1 rounded-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2 text-xs text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!customMsg.trim()}
                  className="w-9 h-9 rounded-full bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-35 shrink-0 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => onLeave(buddy.id)}
                className="w-full py-1.5 rounded-xl text-[11.5px] font-medium text-slate-400 hover:text-[#FF3B30] hover:bg-rose-50 flex items-center justify-center gap-1 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                临时有事，悄悄退出本次搭子
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
