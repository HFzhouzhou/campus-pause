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
import { useAuth } from '../../context/AuthContext';
import { AccountPill } from '../common/AccountPill';
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
  const { user, requireAuth } = useAuth();
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
    requireAuth('举手加入限时搭子并解锁接头暗号', () => {
      const { list } = buddyService.toggleJoin(buddy.id);
      setBuddies(list);
      setActiveCipherId(buddy.id);
      soundEngine.playPop(680);
      triggerHaptic([18, 25]);
      onShowToast('举手成功！查看接头暗号，到点自由解散 ✨', 'success');
    });
  };

  const handleOpenCreate = () => {
    requireAuth('发起 30 分钟限时搭子', () => {
      setCreateOpen(true);
    });
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
    const created = buddyService.createBuddy({
      ...input,
      hostAlias: user?.nickname,
      hostAvatar: user?.avatarUrl,
    });
    setBuddies(buddyService.getAll());
    setCreateOpen(false);
    setActiveCipherId(created.id);
    soundEngine.playCelebrationChime();
    triggerHaptic([20, 30, 40]);
    onShowToast('🎉 你的 30 分钟限时搭子已上线', 'success');
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar ios-canvas">
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 pb-32 space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-0.5">
              Zero-Burden Buddy · 五合校区
            </p>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#1D1D1F] tracking-tight leading-tight">
              无负担限时搭子
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              只陪 30 分钟，到点自动解散，不维系社交关系。
            </p>
          </div>

          <AccountPill />
        </header>

        {/* 分类栏 + 发起按钮 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {BUDDY_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#1D1D1F] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-[#1D1D1F] shadow-sm'
                  }`}
                >
                  <span className="mr-1">{cat.emoji}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-xs sm:text-[13px] shadow-[0_8px_22px_rgba(0,122,255,0.25)] shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            发起 30 分钟搭子
          </motion.button>
        </div>

        {/* 卡片网格 */}
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
                className={`ios-card rounded-[26px] p-5 flex flex-col justify-between gap-4 transition-all ${
                  buddy.joinedByMe ? 'ring-2 ring-[#007AFF]/25' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[#FF9500] text-[11px] font-mono font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {isExpired ? '已解散' : `剩 ${remaining}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {buddy.isSilent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-[#AF52DE] text-[10.5px] font-semibold">
                          <Headphones className="w-3 h-3" />
                          可静音
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2F2F7] text-slate-600 text-[11px] font-semibold">
                        <Users className="w-3 h-3" />
                        {buddy.joinedCount}/{buddy.maxPeople}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[16px] font-bold text-[#1D1D1F] leading-snug tracking-tight">
                      {buddy.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {buddy.vibeNote}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 text-[#1D1D1F] font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                      {buddy.location}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>{buddy.hostAlias}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                    {buddy.boundaryTag}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-[#007AFF] shrink-0" />
                    {buddy.joinedByMe ? `暗号：${buddy.cipher}` : '举手后解锁暗号'}
                  </span>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={isExpired || isFull}
                    onClick={() => handleJoinClick(buddy)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                      buddy.joinedByMe
                        ? 'bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/15'
                        : isFull || isExpired
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[#007AFF] text-white hover:bg-[#0066D6] shadow-sm'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    {buddy.joinedByMe
                      ? '打开频道'
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
