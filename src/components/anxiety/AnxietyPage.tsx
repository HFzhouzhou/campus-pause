import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Cpu,
  History,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { AnxietyBreakdown, MicroStepItem } from '../../types';
import {
  anxietyService,
  isLlmConfigured,
  QUICK_ANXIETY_PROMPTS,
} from '../../services/anxietyService';
import { soundEngine, triggerHaptic } from '../../utils/audio';
import { FocusTimerModal } from './FocusTimerModal';

interface AnxietyPageProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'warm') => void;
}

export const AnxietyPage: React.FC<AnxietyPageProps> = ({ onShowToast }) => {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPreview, setStreamPreview] = useState('');
  const [history, setHistory] = useState<AnxietyBreakdown[]>(() =>
    anxietyService.getHistory()
  );
  const [activePlanId, setActivePlanId] = useState<string | null>(
    () => anxietyService.getHistory()[0]?.id ?? null
  );
  const [timerStep, setTimerStep] = useState<MicroStepItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const llmReady = isLlmConfigured();
  const activePlan = history.find((p) => p.id === activePlanId) ?? history[0] ?? null;

  const handleDecompose = async (customPrompt?: string) => {
    const prompt = (customPrompt ?? input).trim();
    if (!prompt || isStreaming) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInput(prompt);
    setIsStreaming(true);
    setStreamPreview('');
    triggerHaptic(18);

    try {
      const plan = await anxietyService.streamBreakdown(
        prompt,
        (chunkText) => {
          setStreamPreview(chunkText);
        },
        controller.signal
      );
      const updated = anxietyService.getHistory();
      setHistory(updated);
      setActivePlanId(plan.id);
      soundEngine.playPop(720);
      onShowToast('已把巨石切成了 3 个 10 分钟就能干完的微步骤 ✨', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onShowToast('拆解 interrupted，请重试一次', 'info');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCompleteStep = (stepId: string) => {
    if (!activePlan) return;
    const step = activePlan.steps.find((s) => s.id === stepId);
    if (step && !step.completed) {
      const next = anxietyService.toggleStepCompleted(activePlan.id, stepId);
      setHistory(next);
    }
  };

  const handleToggleCheck = (stepId: string) => {
    if (!activePlan) return;
    const next = anxietyService.toggleStepCompleted(activePlan.id, stepId);
    setHistory(next);
    const updatedStep = next
      .find((p) => p.id === activePlan.id)
      ?.steps.find((s) => s.id === stepId);
    if (updatedStep?.completed) {
      soundEngine.playCelebrationChime();
      triggerHaptic([20, 30, 40]);
      onShowToast('太棒了！又拿回了一块掌控感 🎉', 'success');
    }
  };

  const completedCount = activePlan
    ? activePlan.steps.filter((s) => s.completed).length
    : 0;

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#0B0F19]">
      {/* 背景柔和治愈光晕 */}
      <div className="pointer-events-none fixed top-[-100px] right-[-80px] w-80 h-80 rounded-full bg-violet-500/14 blur-[110px]" />
      <div className="pointer-events-none fixed bottom-20 left-[-80px] w-72 h-72 rounded-full bg-emerald-400/10 blur-[100px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-6">
        {/* 头部 */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 text-[11px] font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              焦虑拆解 AI · Micro-Step
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              把吓人的大事，切成 10 分钟微行动
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              拖延不是懒，而是任务太大让大脑卡死了。输入它，马上拿回最小抓手。
            </p>
          </div>

          <span
            title={
              llmReady
                ? '已配置外部 OpenAI 兼容流式 API'
                : '未配置 API Key，使用内置智能拆解流式引擎'
            }
            className="hidden sm:inline-flex items-center gap-1.5 hud-glass rounded-full px-3 py-1.5 text-[11px] text-slate-300 shrink-0"
          >
            <Cpu
              className={`w-3.5 h-3.5 ${
                llmReady ? 'text-emerald-400' : 'text-violet-300'
              }`}
            />
            {llmReady ? '云端 LLM 流式模式' : '内置智能拆解引擎'}
          </span>
        </header>

        {/* 输入区 */}
        <section className="hud-glass rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-glass">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ANXIETY_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleDecompose(q)}
                disabled={isStreaming}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.05] hover:bg-violet-500/20 text-slate-300 hover:text-violet-200 border border-white/10 hover:border-violet-400/40 transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDecompose();
              }}
              placeholder="输入让你头皮发麻的大任务，例如：后天考线代还没复习…"
              className="flex-1 rounded-2xl bg-slate-950/75 border border-white/12 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400/60"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={!input.trim() || isStreaming}
              onClick={() => handleDecompose()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-400 to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow-glow-lavender disabled:opacity-40 shrink-0"
            >
              <Wand2 className="w-4 h-4" />
              {isStreaming ? '正在拆解…' : '帮我拆成3小步'}
            </motion.button>
          </div>
        </section>

        {/* 流式输出实时打字机卡片 */}
        {isStreaming && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="hud-glass rounded-3xl p-5 border border-violet-400/35 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-violet-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
              正在为你拆解最小可行微步骤…
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed">
              {streamPreview}
              <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
            </pre>
          </motion.section>
        )}

        {/* 拆解结果：3 个 10 分钟微步骤 */}
        {!isStreaming && activePlan && (
          <motion.section
            key={activePlan.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 共情接住卡片 + 进度条 */}
            <div className="rounded-3xl bg-gradient-to-br from-violet-500/15 via-slate-900/80 to-emerald-500/10 border border-white/12 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-violet-200 font-medium truncate">
                  目标：{activePlan.prompt}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] shrink-0">
                  已完成 {completedCount} / {activePlan.steps.length}
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                “{activePlan.empathyNote}”
              </p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{
                    width: `${(completedCount / Math.max(1, activePlan.steps.length)) * 100}%`,
                  }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
                />
              </div>
            </div>

            {/* 3 个微步骤卡片 */}
            <div className="space-y-3">
              {activePlan.steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`hud-glass rounded-2xl p-4 border transition-all ${
                    step.completed
                      ? 'border-emerald-400/40 bg-emerald-500/[0.06]'
                      : 'border-white/10 hover:border-violet-400/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(step.id)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-300 transition-colors"
                      aria-label="标记完成状态"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            step.completed
                              ? 'text-emerald-200 line-through opacity-80'
                              : 'text-white'
                          }`}
                        >
                          Step {index + 1} · {step.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Clock className="w-3 h-3 text-violet-300" />
                          {step.durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-slate-300/90 mt-1.5 leading-relaxed">
                        {step.detail}
                      </p>

                      <div className="mt-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setTimerStep(step)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            step.completed
                              ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                              : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-100 border-violet-400/45'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {step.completed
                            ? '再专注 10 分钟'
                            : '立刻开启 10 分钟专注'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 最近拆解历史 */}
        {history.length > 1 && (
          <section className="space-y-2.5 pt-2">
            <h3 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              最近拆解记录（本地保存）
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {history.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActivePlanId(plan.id)}
                  className={`shrink-0 max-w-[200px] truncate px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    activePlan?.id === plan.id
                      ? 'bg-violet-500/25 text-violet-100 border-violet-400/50'
                      : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-slate-200'
                  }`}
                >
                  {plan.prompt}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 10 分钟微行动专注计时器弹窗 */}
      <FocusTimerModal
        step={timerStep}
        onClose={() => setTimerStep(null)}
        onComplete={handleCompleteStep}
      />
    </div>
  );
};
