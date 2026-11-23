import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Headphones, Sparkles, X } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          {/* 柔和磨砂背景 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-md"
          />

          {/* 苹果原生 Sheet 弹窗：Header 固定 + 中间安全滚动 + 底部 CTA 固定永不截断 */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full sm:max-w-[500px] max-h-[90dvh] flex flex-col rounded-t-[30px] sm:rounded-[30px] bg-white/96 backdrop-blur-2xl border border-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] overflow-hidden"
          >
            {/* 移动端拖拽条 */}
            <div className="flex justify-center pt-2.5 sm:hidden shrink-0">
              <div className="w-9 h-1 rounded-full bg-slate-300" />
            </div>

            {/* 固定顶部标题 */}
            <div className="px-5 pt-3.5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-[17px] font-bold text-[#1D1D1F] flex items-center gap-1.5 tracking-tight">
                  <Sparkles className="w-4 h-4 text-[#007AFF]" />
                  发起 30 分钟限时搭子
                </h2>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  到点自动解散 · 不强制加微信 · 零社交包袱
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭发起窗口"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 可滚动表单主体 */}
            <form
              id="create-buddy-form"
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  想一起做什么 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：田径场吹风暴走不说话搭子（30分钟）"
                  className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  活动类型
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SELECTABLE.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        category === cat.id
                          ? 'bg-[#007AFF] text-white shadow-sm'
                          : 'bg-[#F2F2F7] text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    校园集合点 *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例如：明德楼西侧连廊"
                    className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    接头暗号（防尴尬）
                  </label>
                  <input
                    type="text"
                    value={cipher}
                    onChange={(e) => setCipher(e.target.value)}
                    placeholder="例如：穿白卫衣拿冰美式"
                    className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* iOS 分段控制器：时长 & 人数 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    限时时长
                  </label>
                  <div className="bg-[#F2F2F7] p-1 rounded-2xl grid grid-cols-3 gap-1">
                    {[20, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMinutes(m)}
                        className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          durationMinutes === m
                            ? 'bg-white text-[#1D1D1F] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    人数上限
                  </label>
                  <div className="bg-[#F2F2F7] p-1 rounded-2xl grid grid-cols-3 gap-1">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPeople(n)}
                        className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          maxPeople === n
                            ? 'bg-white text-[#1D1D1F] shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {n}人
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* iOS 原生开关：静音陪伴模式 */}
              <div
                onClick={() => setIsSilent((s) => !s)}
                role="switch"
                aria-checked={isSilent}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsSilent((s) => !s);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#F2F2F7] cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 pr-3">
                  <div className="w-8 h-8 rounded-full bg-white text-[#AF52DE] flex items-center justify-center shadow-sm shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1D1D1F]">
                      允许全程不说话 / 戴耳机陪伴
                    </div>
                    <div className="text-[11px] text-slate-500">
                      社恐极度友好，点头示意即可开走
                    </div>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                    isSilent ? 'bg-[#34C759]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isSilent ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  补充氛围说明（选填）
                </label>
                <textarea
                  rows={2}
                  maxLength={100}
                  value={vibeNote}
                  onChange={(e) => setVibeNote(e.target.value)}
                  placeholder="说明你的节奏偏好，比如：走得慢一点、纯干饭不闲聊…"
                  className="w-full rounded-2xl bg-[#F2F2F7] border border-transparent focus:border-[#007AFF] focus:bg-white px-4 py-2.5 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:outline-none resize-none transition-all"
                />
              </div>
            </form>

            {/* 固定底部操作栏：手机电脑永远完整可见 */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-white/95 flex items-center gap-2.5 shrink-0 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-[#F2F2F7] hover:bg-slate-200/80 text-slate-700 text-sm font-semibold transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                form="create-buddy-form"
                disabled={!title.trim() || !location.trim()}
                className="flex-[1.6] py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-35 shadow-[0_8px_20px_rgba(0,122,255,0.26)] transition-all"
              >
                <Check className="w-4 h-4" />
                发布限时搭子
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
