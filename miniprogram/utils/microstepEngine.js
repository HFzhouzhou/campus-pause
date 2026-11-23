/**
 * 纯本地规则场景库「微步拆解引擎」（零外部大模型/零 AIGC，彻底免深度合成备案！）
 * 覆盖 12+ 大学生高频任务场景，强制切分为 3 个 10 分钟微行动，并支持用户随时自定义微调
 */
const STORAGE_KEY = 'cp_mp_microstep_plans_v1';

const QUICK_SCENARIOS = [
  '后天考高数/线代还没复习',
  '专四/四六级单词听力背不完',
  '毕业论文初稿一字未动',
  '明早小组英文 Pre 还没做 PPT',
  '秋招实习简历一直拖着没改',
  '实验报告/课程作业明天截止',
];

const RULE_TEMPLATES = [
  {
    keywords: ['考', '高数', '线代', '概率', '复习', '期末', '挂科', '数学', '专业课'],
    empathyNote: '面对一整本教材大脑会本能卡死——别想着“全部学会”，我们先拿回前 10 分钟的掌控感。',
    steps: [
      { title: '只列 3 个高频考点目录', detail: '翻到课本目录或往年题，用笔圈出分值最高的 3 个章节名（先不看公式，10 分钟内收工）。' },
      { title: '捂答案抄懂 1 道经典例题', detail: '只挑第 1 个考点里最基础的 1 道例题，动手写一遍步骤，懂 70% 就立刻打钩。' },
      { title: '写一张 5 行救命公式卡', detail: '在便签或备忘录记下刚才这道题用到的核心公式，睡前扫一眼就能直接上场。' },
    ],
  },
  {
    keywords: ['英语', '四级', '六级', '专四', '专八', '日语', '韩语', '法语', '泰语', '越语', '单词', '听力', '口语', '小语种'],
    empathyNote: '语言学习最怕一口吃成胖子，每天 10 分钟“轻量化输入”比焦虑一整晚有效十倍。',
    steps: [
      { title: '只刷 15 个高频核心词', detail: '打开词书只过 15 个词，只求“眼熟混个脸熟”，不强求一次拼写全对。' },
      { title: '精听 1 段 60 秒真题音频', detail: '戴上耳机听 1 段短对话，第 1 遍盲听、第 2 遍对照原文划出 2 个听漏的词。' },
      { title: '大声跟读 3 句万能句型', detail: '挑 3 句作文或口语加分句型开口念 3 遍，瞬间进入语感状态。' },
    ],
  },
  {
    keywords: ['论文', '毕业', '初稿', '开题', '文献', '导师', '查重', '综述'],
    empathyNote: '“写完论文”像一座巨山，但“写出丑丑的第一段草稿”只需要 10 分钟，允许初稿不完美！',
    steps: [
      { title: '新建文档敲出三级标题骨架', detail: '打开文档只写“一、背景 二、问题 三、方法 四、结论”，把空白页打破就算赢。' },
      { title: '下 3 篇文献只复制摘要结论', detail: '搜核心关键词下 3 篇近三年论文，只看摘要把每篇 1 句核心观点贴进文档。' },
      { title: '用大白话写满 150 字引言', detail: '像给室友口头解释课题一样随便敲出 150 字，润色留给之后的自己。' },
    ],
  },
  {
    keywords: ['ppt', 'pre', '汇报', '演讲', '答辩', '展示', '小组'],
    empathyNote: '先别纠结配色和动画！观众记住的永远是清晰的 3 个核心观点，先把骨架立住。',
    steps: [
      { title: '用纯文本列 5 页大纲标题', detail: '写下：封面、痛点、方案、案例、总结，每页只写 1 句大白话要点。' },
      { title: '套极简白底模板建前 3 页', detail: '直接选系统自带极简模板，把前 3 页标题和关键词填进去，先不找配图。' },
      { title: '对着手机念一遍开场 30 秒', detail: '录一遍开场白，只要第一句话顺口了，上台的紧张感会自动砍掉一半。' },
    ],
  },
  {
    keywords: ['简历', '秋招', '春招', '实习', '面试', 'offer', '找工作', '投递'],
    empathyNote: '求职期的不确定性最耗心神，今天我们不求拿到 Offer，只把进度往前推 1 毫米。',
    steps: [
      { title: '只改写 1 段经历的成果动词', detail: '挑最拿得出手的 1 段校园/实习经历，按“做了什么+量化结果”改写成 3 句话。' },
      { title: '收藏 3 个匹配度 60% 的岗位', detail: '不用等简历 100 分，先挑 3 个看着顺眼的岗位进收藏夹，记录高频关键词。' },
      { title: '投出今天的“破冰第 1 份”', detail: '选压力最小的一家点击投递，把“零行动”变成“已启动”。' },
    ],
  },
  {
    keywords: ['报告', '实验', '作业', 'ddl', '截止', '周报', '总结'],
    empathyNote: '离 DDL 越近越容易逃避，我们先做最无脑的搬运工作，身体动起来焦虑就会退潮。',
    steps: [
      { title: '套好格式与封面基本信息', detail: '建好文件、填上姓名学号和题目，把老师要求的大标题先全部贴进去。' },
      { title: '整理好图表/素材扔进正文', detail: '把截图、数据或参考要点一股脑拖进对应段落，先填满版面消除恐惧。' },
      { title: '先写最简单的一小节正文', detail: '挑你最熟悉的一节花 10 分钟写完 200 字，建立顺滑的惯性。' },
    ],
  },
];

const DEFAULT_TEMPLATE = {
  empathyNote: '这件事听起来确实压得人喘不过气——但它不是一块不可分割的巨石，我们先切下最轻的 10 分钟。',
  steps: [
    { title: '给这件事画一条“60 分及格线”', detail: '写下完成它最核心的 2 个要素，划掉所有让你卡住的完美主义要求。' },
    { title: '清空桌面只留 1 个必需窗口', detail: '关掉无关页面，倒一杯温水放在手边，只打开马上要用的那 1 个文档。' },
    { title: '完成粗糙的“0.1 起步版”', detail: '不许回头反复修改，定好 10 分钟只管做出最粗糙的第一小块。' },
  ],
};

function matchTemplate(prompt) {
  const lower = (prompt || '').toLowerCase();
  for (const tpl of RULE_TEMPLATES) {
    if (tpl.keywords.some((kw) => lower.includes(kw))) {
      return tpl;
    }
  }
  return DEFAULT_TEMPLATE;
}

function getHistory() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function saveHistory(list) {
  wx.setStorageSync(STORAGE_KEY, list.slice(0, 12));
  return list.slice(0, 12);
}

function createBreakdown(prompt) {
  const tpl = matchTemplate(prompt);
  const plan = {
    id: `plan-${Date.now()}`,
    prompt: prompt.trim(),
    empathyNote: tpl.empathyNote,
    createdAt: '刚刚',
    steps: tpl.steps.map((s, idx) => ({
      id: `step-${Date.now()}-${idx}`,
      title: s.title,
      detail: s.detail,
      durationMinutes: 10,
      completed: false,
    })),
  };
  const next = saveHistory([plan, ...getHistory()]);
  return { plan, history: next };
}

function toggleStepCompleted(planId, stepId) {
  const next = getHistory().map((p) => {
    if (p.id !== planId) return p;
    return {
      ...p,
      steps: p.steps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      ),
    };
  });
  return saveHistory(next);
}

function updateStepContent(planId, stepId, title, detail) {
  const next = getHistory().map((p) => {
    if (p.id !== planId) return p;
    return {
      ...p,
      steps: p.steps.map((s) =>
        s.id === stepId
          ? { ...s, title: title.trim() || s.title, detail: detail.trim() || s.detail }
          : s
      ),
    };
  });
  return saveHistory(next);
}

module.exports = {
  QUICK_SCENARIOS,
  getHistory,
  createBreakdown,
  toggleStepCompleted,
  updateStepContent,
};
