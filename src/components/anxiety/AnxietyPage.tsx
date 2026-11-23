import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Cpu,
  History,
  Play,
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
  const activePlan =
    history.find((p) => p.id === activePlanId) ?? history[0] ?? null;

  const handleDecompose = async (customPrompt?: string) => {
    const prompt = (customPrompt ?? input).trim();
    if (!prompt || isStreaming) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInput(prompt);
    setIsStreaming(true);
    setStreamPreview('');
    triggerHaptic(16);

    try {
      const plan = await anxietyService.streamBreakdown(
        prompt,
        (chunkText) => setStreamPreview(chunkText),
        controller.signal
      );
      setHistory(anxietyService.getHistory());
      setActivePlanId(plan.id);
      soundEngine.playPop(720);
      onShowToast('已拆解为 3 个 10 分钟就能完成的微步骤 ✨', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onShowToast('拆解中断，请重试一次', 'info');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCompleteStep = (stepId: string) => {
    if (!activePlan) return;
    const step = activePlan.steps.find((s) => s.id === stepId);
    if (step && !step.completed) {
      setHistory(anxietyService.toggleStepCompleted(activePlan.id, stepId));
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
      onShowToast('又拿回了一块掌控感 🎉', 'success');
    }
  };

  const completedCount = activePlan
    ? activePlan.steps.filter((s) => s.completed).length
    : 0;

  return (
    <div className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#06080f]">
      <div className="pointer-events-none fixed -top-24 -right-24 w-80 h-80 rounded-full bg-violet-500/14 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-[110px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-7 pb-32 space-y-6">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 mb-1">
              Micro-Step AI · 反拖延拆解
            </p>
            <h1 className="text-[26px] sm:text-3xl font-bold text-white tracking-tight leading-tight">
              焦虑拆解
            </h1>
            <p className="text-xs sm:text-sm text-white/55 mt-1">
              把让人失控的巨型任务，切成 3 个 10 分钟就能动手的微步骤。
            </p>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 liquid-glass rounded-full px-3 py-1.5 text-[11px] text-white/75 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-emerald-300" />
            {llmReady ? 'LLM 流式引擎' : '内置智能引擎'}
          </span>
        </header>

        <section className="liquid-glass rounded-[30px] p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ANXIETY_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleDecompose(q)}
                disabled={isStreaming}
                className="px-3 py-1 rounded-full text-[11.5px] bg-white/[0.07] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
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
              placeholder="输入让你焦虑的大任务，例如：后天考线代还没复习…"
              className="flex-1 rounded-full bg-black/35 border border-white/14 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/35"
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={!input.trim() || isStreaming}
              onClick={() => handleDecompose()}
              className="px-5 py-3 rounded-full bg-white text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-35 shrink-0 shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
            >
              <Wand2 className="w-4 h-4" />
              {isStreaming ? '拆解中…' : '拆成 3 小步'}
            </motion.button>
          </div>
        </section>

        {isStreaming && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="liquid-glass rounded-[28px] p-5 space-y-2"
          >
            <div className="flex items-center gap-2 text-xs text-white/75 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              正在为你拆解最小可行微行动…
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-white/90 leading-relaxed">
              {streamPreview}
              <span className="inline-block w-1.5 h-4 bg-white ml-0.5 align-middle animate-pulse" />
            </pre>
          </motion.section>
        )}

        {!isStreaming && activePlan && (
          <motion.section
            key={activePlan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
          >
            <div className="liquid-glass rounded-[28px] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-white/75 font-medium truncate">
                  {activePlan.prompt}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-medium shrink-0">
                  {completedCount} / {activePlan.steps.length} 已完成
                </span>
              </div>
              <p className="text-sm text-white/85 leading-relaxed">
                “{activePlan.empathyNote}”
              </p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{
                    width: `${
                      (completedCount / Math.max(1, activePlan.steps.length)) *
                      100
                    }%`,
                  }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              {activePlan.steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`liquid-glass rounded-[26px] p-4 sm:p-5 transition-all ${
                    step.completed ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(step.id)}
                      className="mt-0.5 shrink-0 text-white/45 hover:text-emerald-300 transition-colors"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-[15px] font-semibold tracking-tight ${
                            step.completed
                              ? 'text-white/60 line-through'
                              : 'text-white'
                          }`}
                        >
                          0{index + 1} · {step.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/50 shrink-0">
                          <Clock className="w-3 h-3" />
                          {step.durationMinutes}m
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-white/65 mt-1.5 leading-relaxed">
                        {step.detail}
                      </p>

                      <div className="mt-3.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setTimerStep(step)}
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            step.completed
                              ? 'bg-white/10 text-white/80 hover:bg-white/15'
                              : 'bg-white text-slate-950 hover:bg-white/90'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {step.completed ? '再专注 10 分钟' : '开启 10 分钟专注'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {history.length > 1 && (
          <section className="space-y-2 pt-1">
            <h3 className="text-xs font-medium text-white/45 flex items-center gap-1.5 px-1">
              <History className="w-3.5 h-3.5" />
              最近拆解
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {history.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActivePlanId(plan.id)}
                  className={`shrink-0 max-w-[200px] truncate px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                    activePlan?.id === plan.id
                      ? 'bg-white text-slate-950 border-white font-medium'
                      : 'liquid-glass text-white/70 border-white/12'
                  }`}
                >
                  {plan.prompt}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <FocusTimerModal
        step={timerStep}
        onClose={() => setTimerStep(null)}
        onComplete={handleCompleteStep}
      />
    </div>
  );
};
