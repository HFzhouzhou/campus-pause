import { AnxietyBreakdown, MicroStepItem } from '../types';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'anxiety_plans';

export const QUICK_ANXIETY_PROMPTS = [
  '后天考线代还没复习',
  '下个月毕业论文初稿没动',
  '明早小组英文 Pre 还没做 PPT',
  '秋招投递简历一直拖着没改',
];

interface FallbackTemplate {
  keywords: string[];
  empathyNote: string;
  steps: { title: string; detail: string }[];
}

const FALLBACK_TEMPLATES: FallbackTemplate[] = [
  {
    keywords: ['考', '线代', '高数', '复习', '挂科', '期末', '数学', '英语', '四六级', '专业课'],
    empathyNote:
      '面对一整本教材大脑会本能死机——先别想着“全部学会”，我们只拿回今天最初 10 分钟的掌控感。',
    steps: [
      {
        title: '只列 3 个高频考点目录',
        detail:
          '打开手机/草稿纸，翻到课本目录或往年真题，圈出分值最高的 3 个章节名（不看具体公式，10 分钟内收工）。',
      },
      {
        title: '抄写并看懂 1 道经典例题',
        detail:
          '只挑第 1 个高频考点里最基础的 1 道例题，捂住答案抄一遍步骤，哪怕只懂 70% 也立刻打钩。',
      },
      {
        title: '整理 5 行“救命公式卡”',
        detail:
          '在一张便利贴或手机备忘录里写下刚才那道题用到的核心公式，明天睡前扫一眼就能直接上场。',
      },
    ],
  },
  {
    keywords: ['论文', '毕业', '初稿', '开题', '文献', '导师', '报告', '查重'],
    empathyNote:
      '“写完论文”是一个让人窒息的巨兽，但“写烂掉的第一段草稿”只需要 10 分钟。允许初稿丑一点！',
    steps: [
      {
        title: '新建文档并敲出三级标题骨架',
        detail:
          '打开 Word/WPS，只写“一、背景 二、核心问题 三、方法 四、结论”，字体先不管，把空白页打破就算赢。',
      },
      {
        title: '下载 3 篇高引文献只读摘要',
        detail:
          '去知网/Google Scholar 搜核心关键词，下 3 篇近三年高引论文，把每篇摘要的 1 句核心结论贴进文档。',
      },
      {
        title: '用大白话口语写满 150 字引言',
        detail:
          '假装在跟室友解释你的课题，不追求学术腔，10 分钟内随便敲出 150 字，润色留给之后的自己。',
      },
    ],
  },
  {
    keywords: ['ppt', 'pre', '汇报', '演讲', '展示', '答辩', '小组'],
    empathyNote:
      '别一开始就纠结排版配色！先把结构骨架立住，观众记住的永远是清晰的 3 个观点而不是花哨动画。',
    steps: [
      {
        title: '用纯文本敲出 5 页大纲标题',
        detail:
          '在备忘录写下：封面、问题痛点、核心方案、案例数据、总结，每页只写 1 句核心大白话。',
      },
      {
        title: '套用极简深色/纯白母版建前 3 页',
        detail:
          '直接用内置简洁模板，把前 3 页的标题和 3 个关键词放上去，不找素材图，先有雏形。',
      },
      {
        title: '对着手机念一遍开场 30 秒',
        detail:
          '用语音备忘录录一遍开场白，只要第一句话顺口了，上台时的紧张感会自动砍掉一半。',
      },
    ],
  },
  {
    keywords: ['简历', '秋招', '春招', '实习', '面试', 'offer', '找工作', '投递'],
    empathyNote:
      '求职期的不确定性最耗心神，别一次性想“拿到 Offer”，我们把今天的目标缩小到只优化一个像素点。',
    steps: [
      {
        title: '只改写 1 段项目经历的动词',
        detail:
          '打开现有简历，挑最拿得出手的 1 段经历，按“做了什么 + 用了什么方法 + 量化结果”改写成 3 句话。',
      },
      {
        title: '收藏 3 个匹配度 60% 以上的岗位',
        detail:
          '打开招聘软件，不必等简历完美，先筛出 3 个看着顺眼的岗位加进收藏夹，记录它们的共性关键词。',
      },
      {
        title: '投出今天的“破冰第 1 份”',
        detail:
          '挑刚才收藏里压力最小的一家公司点击投递，把“零行动”变成“已启动”，剩下的明天继续。',
      },
    ],
  },
];

const DEFAULT_TEMPLATE: FallbackTemplate = {
  keywords: [],
  empathyNote:
    '这件事听起来确实压得人喘不过气——但它并不是一块不可分割的巨石。我们先切下最轻的那 10 分钟。',
  steps: [
    {
      title: '给这件事画一条“最低及格线”',
      detail:
        '在纸上或备忘录写下：这件事做到 60 分只需要完成哪 2 个核心要素？划掉所有锦上添花的完美主义要求。',
    },
    {
      title: '清空障碍，摆好开工桌面',
      detail:
        '只打开完成任务必需的 1 个文档/网页，把其他 20 个无关标签页关掉，倒一杯温水放在手边，进入起跑位。',
    },
    {
      title: '完成极其粗糙的“0.1 版本”',
      detail:
        '设定 10 分钟闹钟，不许回头修改，只管写出/做出最丑的第一小块内容，迈过最难的启动阻力。',
    },
  ],
};

function matchFallbackTemplate(prompt: string): FallbackTemplate {
  const lower = prompt.toLowerCase();
  for (const tpl of FALLBACK_TEMPLATES) {
    if (tpl.keywords.some((kw) => lower.includes(kw))) {
      return tpl;
    }
  }
  return DEFAULT_TEMPLATE;
}

export function isLlmConfigured(): boolean {
  const url = import.meta.env.VITE_LLM_API_URL?.trim();
  const key = import.meta.env.VITE_LLM_API_KEY?.trim();
  return Boolean(url && key);
}

/**
 * 解析流式输出文本中的结构化微步骤（兼容 LLM Markdown 列表或 JSON 输出）
 */
function parseStepsFromRawText(
  rawText: string,
  fallbackPrompt: string
): { empathyNote: string; steps: MicroStepItem[] } {
  // 尝试优先解析 JSON 代码块
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.steps) && parsed.steps.length >= 1) {
        return {
          empathyNote:
            parsed.empathyNote ||
            '先深呼吸，把大块头切成三块 10 分钟就能吞下的微行动。',
          steps: parsed.steps.slice(0, 3).map(
            (s: { title?: string; detail?: string }, idx: number) => ({
              id: `step-${Date.now()}-${idx}`,
              title: s.title || `微步骤 ${idx + 1}`,
              detail: s.detail || '花 10 分钟专注推进这一小步，不求完美。',
              durationMinutes: 10,
              completed: false,
            })
          ),
        };
      }
    }
  } catch {
    // fallback to line parser
  }

  // 解析带编号文本格式（1. 标题：说明）
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let empathyNote = '';
  const extracted: { title: string; detail: string }[] = [];

  for (const line of lines) {
    const stepMatch = line.match(/^(?:[1-3][.、)）]|步骤\s*[1-3][:：]?)\s*(.+)$/);
    if (stepMatch) {
      const body = stepMatch[1].replace(/\*\*/g, '');
      const splitIdx = body.search(/[:：—-]\s*/);
      if (splitIdx > 0 && splitIdx < 28) {
        extracted.push({
          title: body.slice(0, splitIdx).trim(),
          detail: body.slice(splitIdx + 1).replace(/^[-—:：\s]+/, '').trim(),
        });
      } else {
        extracted.push({
          title: body.slice(0, 22),
          detail: body,
        });
      }
    } else if (!empathyNote && extracted.length === 0) {
      empathyNote = line.replace(/^[💡🌿✨\s]+/, '');
    }
  }

  if (extracted.length >= 3) {
    return {
      empathyNote:
        empathyNote || '大任务之所以可怕是因为没有抓手，我们先赢下前 10 分钟。',
      steps: extracted.slice(0, 3).map((s, idx) => ({
        id: `step-${Date.now()}-${idx}`,
        title: s.title,
        detail: s.detail,
        durationMinutes: 10,
        completed: false,
      })),
    };
  }

  // 兜底补齐
  const tpl = matchFallbackTemplate(fallbackPrompt);
  return {
    empathyNote: empathyNote || tpl.empathyNote,
    steps: tpl.steps.map((s, idx) => ({
      id: `step-${Date.now()}-${idx}`,
      title: s.title,
      detail: s.detail,
      durationMinutes: 10,
      completed: false,
    })),
  };
}

export const anxietyService = {
  getHistory(): AnxietyBreakdown[] {
    return readStorage<AnxietyBreakdown[]>(STORAGE_KEY, []);
  },

  savePlan(plan: AnxietyBreakdown): AnxietyBreakdown[] {
    const next = [plan, ...this.getHistory().filter((p) => p.id !== plan.id)].slice(
      0,
      10
    );
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  toggleStepCompleted(planId: string, stepId: string): AnxietyBreakdown[] {
    const next = this.getHistory().map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        steps: plan.steps.map((s) =>
          s.id === stepId ? { ...s, completed: !s.completed } : s
        ),
      };
    });
    writeStorage(STORAGE_KEY, next);
    return next;
  },

  /**
   * 双模式流式拆解引擎：
   * 1) 若配置了 VITE_LLM_API_URL + VITE_LLM_API_KEY，调用 OpenAI 兼容 SSE 流式接口
   * 2) 否则或请求失败时，自动降级为内置智能拆解 + 逼真打字机流式输出
   */
  async streamBreakdown(
    prompt: string,
    onChunk: (accumulatedText: string) => void,
    signal?: AbortSignal
  ): Promise<AnxietyBreakdown> {
    const apiUrl = import.meta.env.VITE_LLM_API_URL?.trim();
    const apiKey = import.meta.env.VITE_LLM_API_KEY?.trim();
    const model = import.meta.env.VITE_LLM_MODEL?.trim() || 'gpt-4o-mini';

    if (apiUrl && apiKey) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal,
          body: JSON.stringify({
            model,
            stream: true,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content:
                  '你是「校园暂停键」的温柔反焦虑拆解教练，面向大学生。拒绝说教，先用1句简短温暖的话接住情绪，然后严格把用户的焦虑大事拆解成3个“现在花10分钟就能立刻做完的极小微步骤”。请严格按以下格式输出：\n第一行：一句温柔共情短句\n1. 短标题：具体可立刻执行的10分钟微动作\n2. 短标题：具体可立刻执行的10分钟微动作\n3. 短标题：具体可立刻执行的10分钟微动作',
              },
              {
                role: 'user',
                content: `我现在很焦虑这件事：${prompt}`,
              },
            ],
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`LLM HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                fullText += delta;
                onChunk(fullText);
              }
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }

        if (fullText.trim()) {
          const parsed = parseStepsFromRawText(fullText, prompt);
          const plan: AnxietyBreakdown = {
            id: `plan-${Date.now()}`,
            prompt,
            empathyNote: parsed.empathyNote,
            steps: parsed.steps,
            createdAt: '刚刚',
            source: 'llm',
          };
          this.savePlan(plan);
          return plan;
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw err;
        }
        console.warn('[Anxiety AI] 远程 API 调用失败，自动切换本地智能拆解兜底:', err);
      }
    }

    // 内置智能兜底引擎 + 打字机流式模拟
    const tpl = matchFallbackTemplate(prompt);
    const simulatedText = [
      tpl.empathyNote,
      '',
      ...tpl.steps.map((s, i) => `${i + 1}. ${s.title}：${s.detail}`),
    ].join('\n');

    let current = '';
    for (let i = 0; i < simulatedText.length; i += 3) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      current += simulatedText.slice(i, i + 3);
      onChunk(current);
      await new Promise((r) => setTimeout(r, 24));
    }

    const plan: AnxietyBreakdown = {
      id: `plan-${Date.now()}`,
      prompt,
      empathyNote: tpl.empathyNote,
      steps: tpl.steps.map((s, idx) => ({
        id: `step-${Date.now()}-${idx}`,
        title: s.title,
        detail: s.detail,
        durationMinutes: 10,
        completed: false,
      })),
      createdAt: '刚刚',
      source: 'fallback',
    };
    this.savePlan(plan);
    return plan;
  },
};
