import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Hand,
  Headphones,
  KeyRound,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { BuddyActivity, BuddyCategory } from '../../types';
import { BUDDY_CATEGORIES, buddyService } from '../../services/buddyService';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { BuddyCipherModal } from './BuddyCipherModal';
import { CreateBuddyModal } from './CreateBuddyModal';

interface BuddyPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

function formatCountdown(expiresAt: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
  const secs = String(diffSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export const BuddyPage: React.FC<BuddyPageProps> = ({ onShowToast }) => {
  const [buddies, setBuddies] = useState<BuddyActivity[]>(() =>
    buddyService.getAll()
  );
  const [category, setCategory] = useState<BuddyCategory | 'all'>('all');
  const [now, setNow] = useState(() => Date.now());
  const [activeCipherId, setActiveCipherId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // 每秒驱动倒计时
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    if (category === 'all') return buddies;
    return buddies.filter((b) => b.category === category);
  }, [buddies, category]);

  const activeCipherBuddy = useMemo(
    () => buddies.find((b) => b.id === activeCipherId) ?? null,
    [buddies, activeCipherId]
  );

  const handleJoinClick = (buddy: BuddyActivity) => {
    if (buddy.joinedByMe) {
      setActiveCipherId(buddy.id);
      return;
    }
    if (buddy.joinedCount >= buddy.maxPeople) {
      onShowToast('这个限时搭子已经满员啦，看看附近其他场次吧～', 'info');
      return;
    }
    const { list } = buddyService.toggleJoin(buddy.id);
    setBuddies(list);
    setActiveCipherId(buddy.id);
    soundEngine.playPop(680);
    triggerHaptic([18, 25]);
    onShowToast('举手成功！查看接头暗号，到点自由解散 ✨', 'success');
  };

  const handleLeave = (buddyId: string) => {
    const { list } = buddyService.toggleJoin(buddyId);
    setBuddies(list);
    setActiveCipherId(null);
    onShowToast('已悄悄退出本次限时搭子，毫无负担～', 'info');
  };

  const handleSendQuickMsg = (buddyId: string, text: string) => {
    const { list } = buddyService.sendQuickMessage(buddyId, text);
    setBuddies(list);
    soundEngine.playPop(740);
  };

  const handleCreate = (input: {
    title: string;
    category: BuddyCategory;
    location: string;
    durationMinutes: number;
    maxPeople: number;
    cipher: string;
    vibeNote: string;
    isSilent: boolean;
  }) => {
    const created = buddyService.createBuddy(input);
    setBuddies(buddyService.getAll());
    setCreateOpen(false);
    setActiveCipherId(created.id);
    soundEngine.playCelebrationChime();
    triggerHaptic([20, 30, 40]);
    onShowToast('🎉 你的 30 分钟限时搭子已上线！', 'success');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#0B0F19]">
      {/* 背景柔和光晕 */}
      <div className="pointer-events-none fixed top-[-90px] left-1/3 w-80 h-80 rounded-full bg-sky-400/12 blur-[110px]" />
      <div className="pointer-events-none fixed bottom-24 right-[-60px] w-72 h-72 rounded-full bg-emerald-400/10 blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-5">
        {/* 头部 */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 text-[11px] font-medium mb-2">
              <Users className="w-3.5 h-3.5" />
              无负担限时搭子 · Zero-Burden Buddy
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              只陪 30 分钟，不维系关系
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              想找人一起走走、干饭或静音自习，但不想寒暄也不想加微信？就来这里。
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-[0_6px_24px_rgba(56,189,248,0.32)] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            发起 30 分钟限时搭子
          </motion.button>
        </header>

        {/* 分类筛选胶囊 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {BUDDY_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-sky-400/20 text-sky-100 border-sky-400/50'
                    : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 卡片网格流 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((buddy) => {
            const remaining = formatCountdown(buddy.expiresAt, now);
            const isExpired = buddy.expiresAt <= now;
            const isFull =
              buddy.joinedCount >= buddy.maxPeople && !buddy.joinedByMe;

            return (
              <motion.article
                key={buddy.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`hud-glass rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 border transition-all ${
                  buddy.joinedByMe
                    ? 'border-emerald-400/45 shadow-[0_0_24px_rgba(52,211,153,0.12)]'
                    : 'border-white/10 hover:border-sky-400/35'
                }`}
              >
                <div className="space-y-3">
                  {/* 顶部倒计时 + 静音徽章 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-200 text-[11px] font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {isExpired ? '已自动解散' : `剩 ${remaining}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {buddy.isSilent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 text-[10px]">
                          <Headphones className="w-3 h-3" />
                          可全程静音
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-[11px]">
                        <Users className="w-3 h-3 text-sky-300" />
                        {buddy.joinedCount}/{buddy.maxPeople}
                      </span>
                    </div>
                  </div>

                  {/* 标题与说明 */}
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">
                      {buddy.title}
                    </h3>
                    <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                      {buddy.vibeNote}
                    </p>
                  </div>

                  {/* 地点 + 发起人 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {buddy.location}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span>发起人：{buddy.hostAlias}</span>
                  </div>

                  {/* 明确边界标签 */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/[0.09] border border-emerald-400/25 text-[11px] text-emerald-200/95">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {buddy.boundaryTag}
                  </div>
                </div>

                {/* 底部操作按钮 */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-sky-300 shrink-0" />
                    {buddy.joinedByMe
                      ? `暗号：${buddy.cipher}`
                      : '举手后查看接头暗号'}
                  </span>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    disabled={isExpired || isFull}
                    onClick={() => handleJoinClick(buddy)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                      buddy.joinedByMe
                        ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/45 hover:bg-emerald-400/30'
                        : isFull || isExpired
                        ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                        : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    {buddy.joinedByMe
                      ? '打开临时频道'
                      : isFull
                      ? '已满员'
                      : '举手加入'}
                  </motion.button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* 临时轻聊室 / 暗号确认弹窗 */}
      <BuddyCipherModal
        buddy={activeCipherBuddy}
        remainingText={
          activeCipherBuddy
            ? formatCountdown(activeCipherBuddy.expiresAt, now)
            : '00:00'
        }
        onClose={() => setActiveCipherId(null)}
        onSendQuickMessage={handleSendQuickMsg}
        onLeave={handleLeave}
      />

      {/* 发起限时搭子弹窗 */}
      <CreateBuddyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};
