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
      onShowToast('这个限时搭子已经满员啦，看看其他场次吧～', 'info');
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
    onShowToast('已悄悄退出本次搭子，零压力～', 'info');
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
    onShowToast('🎉 你的 30 分钟限时搭子已发布', 'success');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#06080f]">
      <div className="pointer-events-none fixed -top-24 left-1/3 w-80 h-80 rounded-full bg-sky-400/12 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-[110px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-7 pb-32 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-1">
              Zero-Burden Buddy · 五合校区
            </p>
            <h1 className="text-[26px] sm:text-3xl font-bold text-white tracking-tight leading-tight">
              无负担限时搭子
            </h1>
            <p className="text-xs sm:text-sm text-white/55 mt-1">
              只陪 30 分钟，到点自动解散，不维系社交关系。
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-slate-950 font-semibold text-xs sm:text-sm shadow-[0_8px_24px_rgba(255,255,255,0.16)] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            发起 30 分钟搭子
          </motion.button>
        </header>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {BUDDY_CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'liquid-glass text-white/75 hover:text-white'
                }`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

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
                className={`liquid-glass rounded-[28px] p-5 flex flex-col justify-between gap-4 transition-all ${
                  buddy.joinedByMe ? 'border-white/30' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-amber-200 text-[11px] font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {isExpired ? '已解散' : `剩 ${remaining}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {buddy.isSilent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.07] text-white/75 text-[10.5px]">
                          <Headphones className="w-3 h-3" />
                          可静音
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.07] text-white/80 text-[11px]">
                        <Users className="w-3 h-3" />
                        {buddy.joinedCount}/{buddy.maxPeople}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[16px] font-semibold text-white leading-snug tracking-tight">
                      {buddy.title}
                    </h3>
                    <p className="text-xs text-white/65 mt-1.5 leading-relaxed">
                      {buddy.vibeNote}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/55">
                    <span className="inline-flex items-center gap-1 text-white/85">
                      <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      {buddy.location}
                    </span>
                    <span className="text-white/25">·</span>
                    <span>{buddy.hostAlias}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/12 border border-emerald-300/20 text-[11px] text-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    {buddy.boundaryTag}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.09] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/50 truncate flex items-center gap-1">
                    <KeyRound className="w-3 h-3 shrink-0" />
                    {buddy.joinedByMe ? `暗号：${buddy.cipher}` : '举手后解锁暗号'}
                  </span>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={isExpired || isFull}
                    onClick={() => handleJoinClick(buddy)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                      buddy.joinedByMe
                        ? 'bg-white/15 text-white hover:bg-white/20'
                        : isFull || isExpired
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white text-slate-950 hover:bg-white/90'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    {buddy.joinedByMe
                      ? '临时频道'
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

      <CreateBuddyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};
