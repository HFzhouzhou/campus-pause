import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Sparkles, X } from 'lucide-react';
import { BuddyCategory } from '../../types';
import { BUDDY_CATEGORIES } from '../../services/buddyService';

interface CreateBuddyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    category: BuddyCategory;
    location: string;
    durationMinutes: number;
    maxPeople: number;
    cipher: string;
    vibeNote: string;
    isSilent: boolean;
  }) => void;
}

const SELECTABLE = BUDDY_CATEGORIES.filter((c) => c.id !== 'all') as {
  id: BuddyCategory;
  label: string;
  emoji: string;
}[];

export const CreateBuddyModal: React.FC<CreateBuddyModalProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BuddyCategory>('walk');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxPeople, setMaxPeople] = useState(2);
  const [cipher, setCipher] = useState('');
  const [vibeNote, setVibeNote] = useState('');
  const [isSilent, setIsSilent] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;
    onCreate({
      title,
      category,
      location,
      durationMinutes,
      maxPeople,
      cipher,
      vibeNote,
      isSilent,
    });
    setTitle('');
    setLocation('');
    setCipher('');
    setVibeNote('');
    setDurationMinutes(30);
    setMaxPeople(2);
    setIsSilent(true);
  };

  return (
    <AnimatePresence>
      {open && (
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
            className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 z-50 w-auto sm:w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl bg-[#0F1626] border border-white/15 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-300" />
                  发起 30 分钟限时搭子
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  到点自动解散 · 不强制加微信 · 零社交包袱
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  想一起做什么 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：西湖边吹风暴走不说话搭子（30分钟）"
                  className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  活动类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {SELECTABLE.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        category === cat.id
                          ? 'bg-sky-400/20 text-sky-200 border-sky-400/50'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    校园集合点 *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例如：南操场入口大树下"
                    className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    接头暗号（防尴尬）
                  </label>
                  <input
                    type="text"
                    value={cipher}
                    onChange={(e) => setCipher(e.target.value)}
                    placeholder="例如：穿白卫衣拿冰美式"
                    className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    限时时长
                  </label>
                  <div className="flex gap-1.5">
                    {[20, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`flex-1 py-2 rounded-xl text-xs border transition-colors ${
                          durationMinutes === m
                            ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/50'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        {m}分钟
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    人数上限
                  </label>
                  <div className="flex gap-1.5">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPeople(n)}
                        className={`flex-1 py-2 rounded-xl text-xs border transition-colors ${
                          maxPeople === n
                            ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/50'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        {n}人
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 静音模式开关 */}
              <button
                type="button"
                onClick={() => setIsSilent((s) => !s)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-colors ${
                  isSilent
                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-200'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <span>🎧 支持全程不说话 / 戴耳机陪伴模式</span>
                <span className="font-semibold">
                  {isSilent ? '已开启' : '随意聊'}
                </span>
              </button>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  补充氛围说明（可选）
                </label>
                <textarea
                  rows={2}
                  maxLength={100}
                  value={vibeNote}
                  onChange={(e) => setVibeNote(e.target.value)}
                  placeholder="说明你的节奏偏好，比如：走得慢一点、纯干饭不闲聊…"
                  className="w-full rounded-xl bg-slate-950/70 border border-white/12 px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60 resize-none"
                />
              </div>

              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/10"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !location.trim()}
                  className="flex-[1.6] py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  发布限时搭子
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
