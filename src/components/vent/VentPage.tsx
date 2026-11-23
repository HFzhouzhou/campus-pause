import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, ShieldOff, Sparkles, Zap } from 'lucide-react';
import { VentBubble } from '../../types';
import {
  detectHighRiskEmotion,
  QUICK_VENT_TAGS,
  ventService,
} from '../../services/ventService';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { HoldToShoutButton } from './HoldToShoutButton';
import { VortexShredder } from './VortexShredder';
import { CareCard } from './CareCard';

interface VentPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

interface FloatingParticle {
  id: string;
  bubbleId: string;
  emoji: string;
  offsetX: number;
}

export const VentPage: React.FC<VentPageProps> = ({ onShowToast }) => {
  const [ventText, setVentText] = useState('');
  const [isShredding, setIsShredding] = useState(false);
  const [shredSnapshot, setShredSnapshot] = useState('');
  const [shredCount, setShredCount] = useState(0);
  const [showCareCard, setShowCareCard] = useState(false);
  const [bubbles, setBubbles] = useState<VentBubble[]>(() =>
    ventService.getBubbles()
  );
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  const handleShred = () => {
    const trimmed = ventText.trim();
    if (!trimmed || isShredding) return;

    const isHighRisk = detectHighRiskEmotion(trimmed);
    setShredSnapshot(trimmed);
    setIsShredding(true);

    // 合成撕纸 + 黑洞吸入音效 & 手机震动
    soundEngine.playShredAndVortex();
    triggerHaptic([35, 30, 85]);

    window.setTimeout(() => {
      setIsShredding(false);
      setVentText(''); // 阅后即焚，不留任何记录
      setShredCount((c) => c + 1);

      if (isHighRisk) {
        setShowCareCard(true);
      } else {
        onShowToast('情绪已彻底粉碎归零，深吸一口气，此刻属于你自己 🌿', 'warm');
      }
    }, 1300);
  };

  const handleShoutComplete = (intensity: number) => {
    const label =
      intensity > 0.75
        ? '满格声波已排空！肩颈稍微放松下来了吗？'
        : '收到这声长叹，压抑感已散入晚风里～';
    onShowToast(label, 'warm');
  };

  const spawnParticle = (bubbleId: string, emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const offsetX = Math.round((Math.random() - 0.5) * 44);
    setParticles((prev) => [...prev, { id, bubbleId, emoji, offsetX }]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 850);
  };

  const handleHug = (bubbleId: string) => {
    setBubbles(ventService.toggleHug(bubbleId));
    soundEngine.playPop(540);
    triggerHaptic(15);
    spawnParticle(bubbleId, '🫂');
  };

  const handleEmpathy = (bubbleId: string) => {
    setBubbles(ventService.toggleEmpathy(bubbleId));
    soundEngine.playPop(680);
    triggerHaptic(15);
    spawnParticle(bubbleId, '⚡');
  };

  const toneBorder: Record<VentBubble['tone'], string> = {
    mint: 'border-emerald-400/20 hover:border-emerald-400/35',
    amber: 'border-amber-400/20 hover:border-amber-400/35',
    lavender: 'border-violet-400/20 hover:border-violet-400/35',
  };

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#0B0F19]">
      {/* 背景柔和治愈光晕 */}
      <div className="pointer-events-none fixed top-[-120px] left-[-80px] w-72 h-72 rounded-full bg-amber-400/10 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-24 right-[-60px] w-80 h-80 rounded-full bg-violet-500/12 blur-[110px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-6">
        {/* 头部标题 */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-medium mb-2">
              <Flame className="w-3.5 h-3.5" />
              30秒情绪粉碎机 · 阅后即焚
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              把崩溃丢进黑洞里
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              不用讲道理，不用体面，写完即刻撕碎清空，不留任何历史痕迹。
            </p>
          </div>
          {shredCount > 0 && (
            <div className="hud-glass rounded-2xl px-3 py-2 text-right shrink-0">
              <div className="text-[10px] text-slate-400">本次已清空</div>
              <div className="text-sm font-bold text-emerald-300">
                {shredCount} 次情绪
              </div>
            </div>
          )}
        </header>

        {/* 即时宣泄卡片 */}
        <section className="hud-glass rounded-3xl p-4 sm:p-5 space-y-4 shadow-glass">
          {/* 快捷大学生崩溃标签 */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_VENT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setVentText((prev) =>
                    prev.trim() ? `${prev.trim()}，${tag}` : `${tag}！`
                  );
                  triggerHaptic(10);
                }}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.05] hover:bg-amber-400/15 text-slate-300 hover:text-amber-200 border border-white/10 hover:border-amber-400/35 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>

          {/* 极简输入框 */}
          <div className="relative">
            <textarea
              rows={4}
              value={ventText}
              onChange={(e) => setVentText(e.target.value)}
              placeholder="随便敲点什么发泄出来吧…（哪怕只是一串乱码，点下方粉碎后立刻灰飞烟灭）"
              className="w-full rounded-2xl bg-slate-950/75 border border-white/12 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed"
            />
            <span className="absolute bottom-3 right-3.5 text-[10px] text-slate-500">
              本地阅后即焚 · 绝不保存
            </span>
          </div>

          {/* 模拟长按吼一嗓子 */}
          <HoldToShoutButton onShoutComplete={handleShoutComplete} />

          {/* 彻底粉碎主按钮 */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            disabled={!ventText.trim() || isShredding}
            onClick={handleShred}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-violet-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(251,191,36,0.28)] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            彻底粉碎（吸入黑洞 · 阅后即焚）
          </motion.button>
        </section>

        {/* 隐形心理安全兜底：仅在检测到高危词并粉碎后温和浮现 */}
        <CareCard
          visible={showCareCard}
          onDismiss={() => setShowCareCard(false)}
        />

        {/* 校园共鸣墙（严格关闭评论区，杜绝二次内耗） */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-300" />
                同校匿名共鸣墙
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                原来此刻校园里，不只你一个人觉得有点累
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-slate-400 shrink-0">
              <ShieldOff className="w-3 h-3 text-emerald-400" />
              无评论区 · 零社交内耗
            </span>
          </div>

          <div className="space-y-3">
            {bubbles.map((bubble) => {
              const bubbleParticles = particles.filter(
                (p) => p.bubbleId === bubble.id
              );

              return (
                <motion.article
                  key={bubble.id}
                  layout
                  className={`relative hud-glass rounded-2xl p-4 border transition-colors ${toneBorder[bubble.tone]}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.06] text-slate-300 border border-white/10">
                      #{bubble.tag}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      同校匿名 · {bubble.createdAt}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">
                    {bubble.content}
                  </p>

                  {/* 仅允许「🫂 抱抱」或「⚡ 同感」 */}
                  <div className="relative mt-3.5 pt-3 border-t border-white/[0.08] flex items-center gap-2.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleHug(bubble.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        bubble.huggedByMe
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/45'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>🫂</span>
                      <span>抱抱</span>
                      <span className="font-mono text-[11px] opacity-85">
                        {bubble.hugs}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleEmpathy(bubble.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        bubble.empathizedByMe
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/45'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>同感</span>
                      <span className="font-mono text-[11px] opacity-85">
                        {bubble.empathy}
                      </span>
                    </motion.button>

                    {/* 飘出暖心粒子动效 */}
                    <AnimatePresence>
                      {bubbleParticles.map((p) => (
                        <motion.span
                          key={p.id}
                          initial={{ opacity: 1, y: 0, x: p.offsetX, scale: 0.8 }}
                          animate={{
                            opacity: 0,
                            y: -52,
                            x: p.offsetX + (p.offsetX > 0 ? 12 : -12),
                            scale: 1.5,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="pointer-events-none absolute left-16 bottom-6 text-lg select-none"
                        >
                          {p.emoji}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </div>

      {/* 全屏黑洞粒子粉碎动效 */}
      <VortexShredder active={isShredding} shreddingText={shredSnapshot} />
    </div>
  );
};
