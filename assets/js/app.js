/* 本地刷题应用 */
(function () {
  "use strict";

  const BANK = window.QUESTION_BANK;
  const STORAGE_KEY = "zsb_exam_v1";
  const MOCK_KEY = "zsb_mock_v1";
  const MOCK_MINUTES = 120;
  const EXAM_MIN_MINUTES = 20;
  /* 考试模式默认限时：每题约 3 分钟，最少 20 分钟，最多 120 分钟 */
  function examMinutes(total) {
    return Math.min(MOCK_MINUTES, Math.max(EXAM_MIN_MINUTES, Math.round(total * 3)));
  }
  const PAGE_SIZE = 20;
  const app = document.getElementById("app");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!BANK || !BANK.subjects) {
    app.innerHTML = '<div class="list-empty"><div class="big">题库加载失败</div><p>请确认 data/questions.js 文件完整。</p></div>';
    return;
  }

  /* ---------- 图标 ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    bank: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 3v18"/><path d="M12 8h4M12 12h4"/>',
    wrong: '<path d="M5 4h14v17l-7-4-7 4z"/><path d="M9 9l6 6M15 9l-6 6"/>',
    progress: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fire: '<path d="M12 3c1 4 4 5.5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 .5 2 1.5 3 2 2 .5-1-.5-2 0-7z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    function: '<path d="M4 20c2.5 0 3.5-1.5 4-4l2-10c.5-2.5 1.5-4 4-4"/><path d="M7 11h8"/><path d="M14 13c.7 2.5 1.7 4 4 4"/>',
    language: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 7 8"/><path d="M13 21l4-10 4 10M14.5 17h5"/>',
    flag: '<path d="M5 21V4"/><path d="M5 5c4-2 7 2 14 0v9c-7 2-10-2-14 0"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 4v7h-7"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  /* ---------- 数据索引 ---------- */
  const SUBJECTS = BANK.subjects;
  const SMAP = {};
  const QMAP = {};
  /* 英语的真实「题型」记录在 chapter 字段（词汇与语法/完形填空/阅读理解 A~D 篇/语法填空/七选五）。
     这里把四篇阅读合并为「阅读理解」，并为每题计算 section，供英语筛选与展示使用。 */
  function englishSectionOf(chapter) {
    if (!chapter) return "其他";
    if (chapter.indexOf("阅读理解") === 0) return "阅读理解";
    const MAP = { "词汇与语法": "词汇与语法", "完形填空": "完形填空", "语法填空": "语法填空", "七选五": "七选五" };
    return MAP[chapter] || chapter;
  }
  /* 卡片/列表里展示的「分类」：英语显示题型(section)，其余科目显示章节(chapter) */
  function classifyOf(q) { return q.subjectId === "english" ? (q.section || q.chapter) : q.chapter; }
  SUBJECTS.forEach(s => {
    SMAP[s.id] = s;
    s.questions.forEach(q => {
      q.subjectId = s.id;
      if (s.id === "english") q.section = englishSectionOf(q.chapter);
      QMAP[q.id] = q;
    });
  });
  const ALL_QS = SUBJECTS.flatMap(s => s.questions);
  const TOTAL = ALL_QS.length;

  const TYPE_NAME = { single: "选择题", multiple: "多选题", judgment: "判断题", fill: "填空题", calculation: "计算题", solution: "解答题" };
  const TYPE_TAG = { single: "tag-blue", multiple: "tag-amber", judgment: "tag-gray", fill: "tag-green", calculation: "tag-violet", solution: "tag-amber" };
  /* 计算题与解答题同属「主观书写题」：文本作答 + 对照参考答案自评 */
  function isTextAnswer(q) { return q.type === "solution" || q.type === "calculation"; }

  /* 题型体系按「科目」独立：
     - 同一 type 值在不同科目显示各自名称（英语的 solution 实为写作题、政治为简答辨析题、
       电子为计算分析题、数学为解答题）；
     - 筛选下拉只出现该科目真实存在的题型，避免「计算题」出现在英语等无关科目里。 */
  const SUBJECT_TYPES = {
    math: [
      { t: "single", n: "选择题" },
      { t: "fill", n: "填空题" },
      { t: "calculation", n: "计算题" },
      { t: "solution", n: "解答题" }
    ],
    english: [
      { t: "single", n: "选择题" },
      { t: "fill", n: "填空题" },
      { t: "solution", n: "写作题" }
    ],
    politics: [
      { t: "single", n: "选择题" },
      { t: "solution", n: "简答辨析题" }
    ],
    electronics: [
      { t: "single", n: "选择题" },
      { t: "multiple", n: "多选题" },
      { t: "judgment", n: "判断题" },
      { t: "fill", n: "填空题" },
      { t: "solution", n: "计算分析题" }
    ]
  };
  function typesOf(sid) { return SUBJECT_TYPES[sid] || null; }
  function typeOrderOf(sid) {
    const c = typesOf(sid);
    return c ? c.map(x => x.t) : TYPE_ORDER.slice();
  }
  function typeNameOf(sid, t) {
    const c = typesOf(sid);
    if (c) { const f = c.find(x => x.t === t); if (f) return f.n; }
    return TYPE_NAME[t] || "其他";
  }
  /* 题型下拉选项：指定科目时只给该科目的题型；「全部」时给并集（默认名） */
  function typeOptions(sid) {
    const c = typesOf(sid);
    if (c) return [["all", "全部题型"]].concat(c.map(x => [x.t, x.n]));
    return [["all", "全部题型"]].concat(TYPE_ORDER.map(t => [t, TYPE_NAME[t]]));
  }
  const DIFF_NAME = { 1: "简单", 2: "中等", 3: "困难" };
  const DIFF_TAG = { 1: "tag-green", 2: "tag-amber", 3: "tag-red" };
  function diffTag(d) { return d ? '<span class="tag ' + (DIFF_TAG[d] || "tag-gray") + '">' + (DIFF_NAME[d] || "难度") + '</span>' : ''; }

  /* 题目配图：源站电路图等，点击可放大查看 */
  function questionImage(q) {
    if (!q || !q.image) return "";
    return '<div class="q-image"><img src="' + esc(q.image) + '" alt="题目配图" loading="lazy" data-zoomable referrerpolicy="no-referrer"></div>';
  }

  /* ---------- 本地状态 ---------- */
  function defaultState() {
    return { progress: {}, wrong: {}, history: [], lastSubject: "", version: 1 };
  }
  let state = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed, {
        progress: parsed.progress || {},
        wrong: parsed.wrong || {},
        history: Array.isArray(parsed.history) ? parsed.history : []
      });
    } catch (e) {
      return defaultState();
    }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function attempted(qid) { return !!state.progress[qid]; }
  function isCorrect(qid) { return state.progress[qid] && state.progress[qid].lastResult === "correct"; }
  function isWrong(qid) { return state.progress[qid] && state.progress[qid].lastResult === "wrong"; }
  function unmasteredWrongIds() { return Object.keys(state.wrong).filter(id => QMAP[id] && !state.wrong[id].mastered); }
  function subjectDone(s) { return s.questions.filter(q => attempted(q.id)).length; }
  function overallDone() { return ALL_QS.filter(q => attempted(q.id)).length; }
  function pct(n, d) { return d ? Math.round(n * 100 / d) : 0; }

  /* ---------- 视图内状态 ---------- */
  let practice = null;
  let bankFilter = { subject: "all", type: "all", category: "all", module: "all", chapter: "all", section: "all", status: "all", difficulty: "all", search: "", page: 1 };
  let wrongFilter = "all";
  let searchTimer = null;

  /* ---------- 模拟考：组卷与本地缓存 ---------- */
  /* 缓存里存的是「剩余毫秒数」，离开考试即冻结，回来再续，不会在后台偷跑 */
  function loadMockCache() {
    try {
      const raw = localStorage.getItem(MOCK_KEY);
      if (!raw) return null;
      const m = JSON.parse(raw);
      if (!m || !Array.isArray(m.ids) || !m.ids.length) return null;
      let remain = m.remainingMs;
      if (remain == null && m.deadline) remain = m.deadline - Date.now(); // 兼容旧缓存
      remain = Math.max(0, Number(remain) || 0);
      if (remain <= 0) { localStorage.removeItem(MOCK_KEY); return null; }
      m.remainingMs = remain;
      m.deadline = Date.now() + remain;
      return m;
    } catch (e) { return null; }
  }
  function saveMockCache(m) {
    try { localStorage.setItem(MOCK_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function clearMockCache() {
    try { localStorage.removeItem(MOCK_KEY); } catch (e) {}
  }
  function fmtClock(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(t / 3600)).padStart(2, "0") + ":" +
      String(Math.floor(t % 3600 / 60)).padStart(2, "0") + ":" +
      String(t % 60).padStart(2, "0");
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  const TYPE_ORDER = ["single", "multiple", "judgment", "fill", "calculation", "solution"];

  /* 模拟考的科目级题型规则（在「最新真题分布」基础上调整）：
     - electronics：不考计算分析题（解答题）——电子模拟考只考客观题（选择/填空/判断），
       填空/单选题量取自最新真题，判断题题库充足、按 10 道补入。 */
  const MOCK_TYPE_RULE = {
    electronics: { exclude: ["solution"], extra: { judgment: 10 } }
  };

  /* 取该科目最近一年真题的题型分布作为组卷模板 */
  function paperTemplate(subject) {
    const cats = unique(subject.questions.map(q => q.category)).filter(c => /真题/.test(c));
    if (!cats.length) return null;
    const yearOf = c => Number((String(c).match(/\d{4}/) || [0])[0]) || 0;
    const picked = cats.slice().sort((a, b) => yearOf(b) - yearOf(a) || String(b).localeCompare(String(a), "zh-CN"))[0];
    const qs = subject.questions.filter(q => q.category === picked);
    if (!qs.length) return null;
    const dist = {};
    qs.forEach(q => { dist[q.type] = (dist[q.type] || 0) + 1; });
    const rule = MOCK_TYPE_RULE[subject.id];
    if (rule) {
      (rule.exclude || []).forEach(t => { delete dist[t]; });
      Object.keys(rule.extra || {}).forEach(t => { dist[t] = (dist[t] || 0) + rule.extra[t]; });
    }
    const total = Object.keys(dist).reduce((sum, t) => sum + dist[t], 0);
    return { category: picked, dist: dist, total: total, year: yearOf(picked), ruled: !!rule };
  }

  /* 组卷：含「篇章」的科目（英语等）必须整篇选取——选中的阅读/完形/七选五/语法填空，
     连同该篇章的全部小题一起纳入，保证模拟考出现的是「完整的阅读」（篇章一次、题目成组），
     而不是把同篇章题目拆成各自独立的小题。
     按模板「目标驱动」凑数：对每个题型，先用放得下的整篇章填，不足再用零散题补；
     最后按题型顺序排卷面（同题型内保持选取顺序，篇章天然连续完整），
     使模拟考的题型分布与最新真题严格一致。无篇章科目（数学/政治）行为不变。 */
  function buildMockPaper(subject) {
    const tpl = paperTemplate(subject);
    const CAP = tpl ? tpl.total : 60;          // 卷面题量
    const ids = [];
    const used = {};
    const mark = q => { used[q.id] = true; ids.push(q.id); };
    const isUsed = q => !!used[q.id];
    const shuf = arr => shuffle(arr.slice());
    const qById = {};
    subject.questions.forEach(q => { qById[q.id] = q; });

    // 篇章分组：只收「同题型」的完整篇章（混合篇章留到补充步，避免拆散）
    const byPassage = {};
    subject.questions.forEach(q => { if (q.passageId) (byPassage[q.passageId] = byPassage[q.passageId] || []).push(q); });
    const purePassages = Object.values(byPassage).filter(g => g.every(q => q.type === g[0].type));

    if (tpl) {
      // 1) 按模板题型逐个凑数（顺序即卷面题型顺序）
      typeOrderOf(subject.id).forEach(type => {
        let need = tpl.dist[type] || 0;
        if (need <= 0) return;
        // 1a) 先用「放得下」的整篇章填（保持完整阅读）
        const tpass = shuf(purePassages.filter(g => g[0].type === type && g.every(q => !isUsed(q))));
        for (const g of tpass) {
          if (need <= 0) break;
          if (g.length <= need) { g.forEach(mark); need -= g.length; }
        }
        // 1b) 不足再用零散题补
        if (need > 0) {
          const pool = subject.questions.filter(q => q.type === type && !isUsed(q));
          shuf(pool).slice(0, need).forEach(mark);
          need -= Math.min(need, pool.length);
        }
        // 1c) 该题型只剩放不下的整篇章（如语法填空 10 题/篇）——整体选入，保证题型出现
        if (need > 0) {
          const rest = purePassages
            .filter(g => g[0].type === type && g.every(q => !isUsed(q)))
            .sort((a, b) => a.length - b.length);
          if (rest.length) rest[0].forEach(mark);
        }
      });
      // 2) 仍不足 CAP（极端情况）：用任意题补足
      if (ids.length < CAP) {
        const pool = subject.questions.filter(q => !isUsed(q));
        shuf(pool).slice(0, CAP - ids.length).forEach(mark);
      }
      // 3) 卷面按题型顺序排列（稳定排序：同题型内保持选取顺序，篇章连续完整）
      const rank = {};
      typeOrderOf(subject.id).forEach((t, i) => { rank[t] = i; });
      const ordered = ids.map((id, i) => ({ id: id, i: i }))
        .sort((a, b) => (rank[qById[a.id].type] - rank[qById[b.id].type]) || (a.i - b.i))
        .map(x => x.id);
      ids.length = 0;
      ordered.forEach(id => ids.push(id));
    } else {
      [["single", 20], ["multiple", 5], ["judgment", 5], ["fill", 5], ["solution", 2]].forEach(([type, n]) => {
        const pool = subject.questions.filter(q => q.type === type && !isUsed(q));
        shuf(pool).slice(0, n).forEach(mark);
      });
    }
    return { ids: ids, template: tpl };
  }

  function startMockExam(subjectId, fresh) {
    const s = SMAP[subjectId];
    if (!s) { toast("科目不存在", "no"); return; }
    const cached = loadMockCache();
    if (!fresh && cached && cached.subjectId === subjectId && cached.ids.every(id => QMAP[id])) {
      resumeMock(cached);
      return;
    }
    const paper = buildMockPaper(s);
    if (!paper.ids.length) { toast("该科目题量不足，无法组卷", "no"); return; }
    const now = Date.now();
    const deadline = now + MOCK_MINUTES * 60000;
    const cache = {
      subjectId: subjectId,
      title: s.name + " · 模拟考",
      ids: paper.ids,
      template: paper.template,
      remainingMs: MOCK_MINUTES * 60000,
      createdAt: now,
      selections: {},
      index: 0
    };
    saveMockCache(cache);
    practice = {
      ids: cache.ids, index: 0, title: cache.title, mode: "mock",
      selections: {}, submitted: {}, results: {}, expanded: {},
      startedAt: now, deadline: deadline, subjectId: subjectId, template: paper.template
    };
    buildGroups(practice);
    practice.groupIndex = groupOf(practice.index);
    if (location.hash === "#/practice") renderPractice(); else location.hash = "#/practice";
    toast("已随机组卷，考试时长 2 小时");
  }

  function resumeMock(cache) {
    practice = {
      ids: cache.ids, index: Math.min(cache.index || 0, cache.ids.length - 1),
      title: cache.title, mode: "mock",
      selections: cache.selections || {}, submitted: {}, results: {}, expanded: {},
      startedAt: cache.createdAt, deadline: cache.deadline,
      subjectId: cache.subjectId, template: cache.template
    };
    buildGroups(practice);
    practice.groupIndex = groupOf(practice.index);
    if (location.hash === "#/practice") renderPractice(); else location.hash = "#/practice";
    toast("已恢复上次模拟考，剩余 " + fmtClock(cache.deadline - Date.now()));
  }

  function persistMockProgress() {
    if (!practice || practice.mode !== "mock" || practice.finished) return;
    const remain = Math.max(0, practice.deadline - Date.now());
    saveMockCache({
      subjectId: practice.subjectId,
      title: practice.title,
      ids: practice.ids,
      template: practice.template,
      remainingMs: remain,
      createdAt: practice.startedAt,
      selections: practice.selections,
      index: practice.index,
      groupIndex: practice.groupIndex
    });
  }

  /* 离开答题页：冻结剩余时间，计时不在后台继续走 */
  function pauseMock() {
    if (!practice || practice.mode !== "mock" || practice.finished) return;
    persistMockProgress();
  }

  let mockTimer = null;
  function stopMockTimer() {
    if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
  }
  function startMockTimer() {
    stopMockTimer();
    const tick = () => {
      const el = document.getElementById("mockClock");
      if (!el || !practice || !isExam() || !practice.deadline) { stopMockTimer(); return; }
      const left = practice.deadline - Date.now();
      el.textContent = fmtClock(left);
      el.classList.toggle("warn", left <= 10 * 60000);
      if (left <= 0) { stopMockTimer(); toast("考试时间到，已自动交卷", "no"); submitExam(true); }
    };
    tick();
    mockTimer = setInterval(tick, 1000);
  }

  function isExam() {
    return !!practice && (practice.mode === "exam" || practice.mode === "mock");
  }

  /* ---------- 文本工具 ---------- */
  const MATH_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;
  /* 小问标记：(1)(2)（一）（二）①②…。把多问题题干拆成段落显示（练习/考试/详情页）。
     调用时机：公式已被 MATH_RE 提成占位符之后——公式内的 (1) 不会误拆；
     标记前不能是字母/右括号——排除 f(1)、a(2) 这类函数记号。 */
  const SUBQ_RE = /[（(]\s*(?:\d{1,2}|[一二三四五六七八九十]|[①②③④⑤⑥⑦⑧⑨⑩])\s*[)）]/g;
  function splitSubQuestions(safe) {
    let out = "", last = 0, m;
    SUBQ_RE.lastIndex = 0;
    while ((m = SUBQ_RE.exec(safe))) {
      const prev = safe[m.index - 1] || "";
      if (prev && /[A-Za-z0-9)\]」”]/.test(prev)) continue;
      out += safe.slice(last, m.index) + "\n\n";
      last = m.index;
    }
    return last ? out + safe.slice(last) : safe;
  }
  function renderMD(text, inline, splitSub) {
    if (text == null) return "";
    const store = [];
    let safe = String(text).replace(MATH_RE, m => {
      const key = "@@MATH" + store.length + "@@";
      store.push(m);
      return key;
    });
    /* 数据噪声：OCR 把上划线/取反标记识别成了 <o>...</o>（电子科目 600+ 处）。
       marked 默认把 <o> 当 HTML 注入，会破坏列表布局，先剥掉（公式内的已被 MATH_RE 提走，不受影响） */
    safe = safe.replace(/<\/?o(?:\s[^>]*)?>/gi, "");
    let html;
    try {
      const src = (splitSub && !inline) ? splitSubQuestions(safe) : safe;
      html = inline ? marked.parseInline(src) : marked.parse(src, { breaks: true, gfm: true });
    } catch (e) {
      html = safe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    }
    /* 公式原文还原前必须转义 & < >：
       $0<x<2$ 里的 <x 会被浏览器当成不闭合的 HTML 标签开始，一路吞掉后续 DOM，
       导致题库列表行嵌套、卡片错位（数学解答题筛选后滚动复现的那个 bug）。
       转义后 innerHTML 解析出的文本节点仍是 < ，KaTeX typeset 不受影响。 */
    return html.replace(/@@MATH(\d+)@@/g, (_, i) =>
      String(store[+i]).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    );
  }
  function typeset(root) {
    if (!window.renderMathInElement) return;
    try {
      renderMathInElement(root || app, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false,
        /* 阅读材料是纯英文 prose（常含 $250,000 这类金额），绝不能当公式解析：
           否则两个 $ 之间的整段英文会被渲染成不可换行的超宽公式，把手机布局撑成 PC 宽度 */
        ignoredClasses: ["passage-body", "no-math"],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
      });
    } catch (e) {}
  }
  function plainText(s) {
    return String(s || "")
      .replace(MATH_RE, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/[#>*`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  /* 列表预览：保留公式，按可见字数截断，避免数学题预览只剩“= （　）” */
  function previewStem(text, limit) {
    const s = String(text || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/^\s*\|.*\|\s*$/gm, " ")
      .replace(/^\s*>.*$/gm, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!s) return "";
    const re = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;
    let out = "", visible = 0, last = 0, m, truncated = false;
    while ((m = re.exec(s))) {
      const chunk = s.slice(last, m.index);
      if (visible + chunk.length >= limit) {
        out += chunk.slice(0, Math.max(0, limit - visible));
        truncated = true;
        last = s.length;
        break;
      }
      out += chunk;
      visible += chunk.length;
      out += m[0];
      visible += 6;
      last = m.index + m[0].length;
      if (visible >= limit) { truncated = true; last = s.length; break; }
    }
    if (!truncated && last < s.length) {
      const rest = s.slice(last);
      if (visible + rest.length > limit) { out += rest.slice(0, Math.max(0, limit - visible)); truncated = true; }
      else out += rest;
    }
    // 预览公式缩小尺寸：把 \dfrac→\frac、去掉 \displaystyle 和 \limits，避免 KaTeX 渲染成高大展示型
    out = out.replace(/\\dfrac/g, "\\frac").replace(/\\displaystyle/g, "").replace(/\\limits/g, "");
    return out.trim() + (truncated ? "…" : "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function dateKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + " 天前";
    const d = new Date(ts);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 11) return "早上好";
    if (h < 14) return "中午好";
    if (h < 19) return "下午好";
    return "晚上好";
  }
  function scrollTop(smooth) {
    const root = document.documentElement;
    if (smooth && !reduceMotion) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      /* non-smooth 时要求瞬间定位到顶部：临时关掉 CSS 的 scroll-behavior:smooth，
         否则 "auto" 会继承 smooth 产生滑动动画（部分旧内核也不认 "instant" 关键字） */
      const prev = root.style.scrollBehavior;
      if (prev !== "auto") root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      if (prev !== "auto") root.style.scrollBehavior = prev;
    }
  }
  function toast(msg, type) {
    const wrap = document.getElementById("toastWrap");
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; }, 2200);
    setTimeout(() => el.remove(), 2550);
  }

  /* ---------- 判分 ---------- */
  function normalize(s) {
    let x = String(s == null ? "" : s).trim().toLowerCase();
    x = x.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248));
    x = x.replace(/[（）：，；。！？【】“”‘’、]/g, ch => ({ "（": "(", "）": ")", "：": ":", "，": ",", "；": ";", "。": ".", "！": "!", "？": "?", "【": "[", "】": "]", "“": '"', "”": '"', "‘": "'", "’": "'", "、": "," }[ch] || ch));
    x = x.replace(/\\left|\\right/g, "");
    x = x.replace(/\\mathrm\s*\{\s*d\s*\}|\\text\s*\{\s*d\s*\}/g, "d");
    x = x.replace(/\\,|\\;|\\!|\\quad|\\qquad/g, "");
    x = x.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    x = x.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
    x = x.replace(/\\sqrt\s*([a-zA-Z0-9])/g, "√$1");
    x = x.replace(/\\pi/g, "π");
    x = x.replace(/\\ln/g, "ln").replace(/\\sin/g, "sin").replace(/\\cos/g, "cos").replace(/\\tan/g, "tan");
    x = x.replace(/\\[a-zA-Z]+/g, "");
    x = x.replace(/[{}()\[\]$\\]/g, "");
    x = x.replace(/[·×*]/g, "");
    x = x.replace(/\s+/g, "");
    x = x.replace(/\^/g, "^");
    return x;
  }
  function fillCandidates(q) {
    const raw = q.answers || (q.answer ? [q.answer] : []);
    const out = [];
    raw.forEach(a => {
      const s = String(a == null ? "" : a);
      out.push(s);
      s.split(/\s*(?:\/|;|；|\||或)\s*/).forEach(v => { if (v.trim()) out.push(v.trim()); });
    });
    return Array.from(new Set(out.map(normalize))).filter(Boolean);
  }
  function checkFill(q, user) {
    if (!user || !String(user).trim()) return false;
    return fillCandidates(q).includes(normalize(user));
  }
  function correctKeys(q) {
    return String(q.answer || "").toUpperCase().split("").filter(Boolean);
  }
  function choiceLabel(q, key) {
    if (!key) return "未作答";
    if (q.type === "judgment") {
      const o = (q.options || []).find(x => x.key === key);
      if (o) return o.text;
    }
    return key;
  }
  function checkChoice(q, user) {
    if (q.type === "multiple") {
      const arr = Array.isArray(user) ? user.slice() : String(user || "").split("");
      return arr.map(x => String(x).toUpperCase()).sort().join("") === correctKeys(q).slice().sort().join("");
    }
    return String(user || "").toUpperCase() === String(q.answer || "").toUpperCase();
  }

  /* ---------- 全局进度条 ---------- */
  function updateChrome() {
    const done = overallDone();
    const percent = pct(done, TOTAL);
    const ring = document.getElementById("miniRing");
    const pctEl = document.getElementById("miniPercent");
    if (ring) ring.style.strokeDashoffset = String(94.2 * (1 - percent / 100));
    if (pctEl) pctEl.textContent = percent + "%";
    const badge = document.getElementById("wrongNavBadge");
    const n = unmasteredWrongIds().length;
    if (badge) { badge.hidden = n === 0; badge.textContent = n > 99 ? "99+" : n; }
    const meta = document.getElementById("footerMeta");
    if (meta) meta.textContent = "共 " + TOTAL + " 题 · 已答 " + done + " 题 · 数据保存在本机浏览器";
  }

  function setActiveNav(name) {
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-nav") === name);
    });
    const nav = document.getElementById("mainNav");
    if (nav) nav.classList.remove("open");
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    setActiveNav("home");
    const done = overallDone();
    const percent = pct(done, TOTAL);
    const recent = state.history.slice(-4).reverse().filter(h => QMAP[h.qid]);
    const weak = chapterStats().filter(x => x.attempted > 0).sort((a, b) => a.acc - b.acc || b.attempted - a.attempted).slice(0, 4);
    const lastSubject = SMAP[state.lastSubject] || SUBJECTS[0];
    const nextIds = pickContinueIds(lastSubject, 20);

    app.innerHTML = '<div class="view">' +
      '<section class="hero">' +
        '<div class="hero-copy">' +
          '<div class="eyebrow">本地精选题库</div>' +
          '<h1>' + greeting() + '，把每一道题<br>变成<em>得分点</em>。</h1>' +
          '<p class="hero-desc">高等数学、英语、政治理论、电子技术基础，' + TOTAL + ' 道题按科目、套卷、题型与章节整理。支持练习模式、考试模式与两小时模拟考，做完即时判分，错题自动收进错题本，进度留在这台电脑上。</p>' +
          '<div class="hero-stats">' +
            '<div class="hero-stat"><strong>' + TOTAL + '</strong><span>题库总量</span></div>' +
            '<div class="hero-stat"><strong>' + done + '</strong><span>已完成</span></div>' +
            '<div class="hero-stat"><strong>' + percent + '%</strong><span>整体进度</span></div>' +
          '</div>' +
          '<div class="hero-actions">' +
            '<button class="btn btn-primary" data-action="continue">' + icon("play") + '继续练习</button>' +
            '<a class="btn btn-soft" href="#/mock">' + icon("flag") + '开始模拟考</a>' +
            '<a class="btn btn-outline" href="#/papers">' + icon("book") + '整卷套题</a>' +
            '<a class="btn btn-ghost" href="#/bank">' + icon("grid") + '浏览题库</a>' +
          '</div>' +
        '</div>' +
        '<div class="hero-side">' +
          '<div>' +
            '<div class="progress-orbit" style="--p:' + (percent * 3.6) + 'deg">' +
              '<div class="progress-orbit-inner"><strong>' + percent + '%</strong><span>OVERALL</span></div>' +
            '</div>' +
            '<div class="hero-subjects">' + SUBJECTS.map(s => '<span class="hero-subject">' + esc(s.short) + ' ' + pct(subjectDone(s), s.questions.length) + '%</span>').join("") + '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="section-head"><div><h2>按科目练习</h2><p>先选科目，再按年份、题型和章节筛选。</p></div><a class="link-btn" href="#/bank">全部题目' + icon("arrow") + '</a></div>' +
      '<div class="subject-grid">' + SUBJECTS.map(subjectCard).join("") + '</div>' +

      '<div class="section-head"><div><h2>学习概览</h2><p>最近做过什么，哪里还需要再练。</p></div><a class="link-btn" href="#/progress">完整进度' + icon("arrow") + '</a></div>' +
      '<div class="overview-grid">' +
        '<div class="panel">' +
          '<div class="panel-head"><h3>' + icon("clock") + '最近练习</h3><span class="small muted">' + (recent.length ? recent.length + " 条" : "") + '</span></div>' +
          (recent.length ? '<div class="recent-list">' + recent.map(recentItem).join("") + '</div>' :
            '<div class="empty-state"><strong>还没有练习记录</strong>从任意科目开始，答题后这里会出现你的学习轨迹。</div>') +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel-head"><h3>' + icon("target") + '需要巩固的知识点</h3><span class="small muted">按正确率</span></div>' +
          (weak.length ? '<div class="chapter-list">' + weak.map(w => {
            const color = w.acc < 60 ? "var(--red)" : w.acc < 80 ? "var(--amber)" : "var(--green)";
            return '<div class="chapter-row"><span>' + esc(w.chapter) + '</span><b>' + w.acc + '%</b><div class="subject-bar"><i style="width:' + w.acc + '%;background:' + color + '"></i></div></div>';
          }).join("") + '</div>' :
            '<div class="empty-state"><strong>暂时没有数据</strong>完成几道题后，系统会按题型/章节统计正确率。</div>') +
        '</div>' +
      '</div>' +
    '</div>';

    const cont = app.querySelector('[data-action="continue"]');
    if (cont) cont.addEventListener("click", () => startPractice(nextIds, lastSubject.name + " · 继续练习", "practice"));
    typeset(app);
    updateChrome();
  }

  function subjectCard(s) {
    const done = subjectDone(s);
    const p = pct(done, s.questions.length);
    const cats = Array.from(new Set(s.questions.map(q => q.category)));
    return '<a class="subject-card" style="--accent:' + s.color + '" href="#/bank" data-subject-jump="' + s.id + '">' +
      '<div class="subject-top"><div class="subject-icon">' + icon(s.icon) + '</div><div class="subject-count"><strong>' + s.questions.length + '</strong>道题</div></div>' +
      '<h3>' + esc(s.name) + '</h3>' +
      '<p>' + esc(s.description) + '</p>' +
      '<div class="subject-meta"><span>' + cats.length + ' 个年份 / 套题</span><span>已完成 ' + done + ' / ' + s.questions.length + '</span></div>' +
      '<div class="subject-bar"><i style="width:' + p + '%"></i></div>' +
      '<div class="subject-link"><span>' + (p === 0 ? "开始练习" : "继续练习 · " + p + "%") + '</span>' + icon("chevron") + '</div>' +
    '</a>';
  }

  function recentItem(h) {
    const q = QMAP[h.qid];
    const s = SMAP[q.subjectId];
    return '<div class="recent-item"><span class="status-dot ' + (h.result === "correct" ? "correct" : "wrong") + '"></span>' +
      '<div class="recent-main"><strong>' + renderMD(previewStem(q.stem, 45), true) + '</strong><span>' + esc(s.name) + ' · ' + esc(classifyOf(q)) + ' · ' + timeAgo(h.at) + '</span></div>' +
      '<span class="recent-result ' + (h.result === "correct" ? "ok" : "no") + '">' + (h.result === "correct" ? "答对" : "答错") + '</span></div>';
  }

  function chapterStats() {
    const map = {};
    ALL_QS.forEach(q => {
      if (!attempted(q.id)) return;
      const key = q.subjectId + "/" + classifyOf(q);
      if (!map[key]) map[key] = { chapter: classifyOf(q), subject: SMAP[q.subjectId].name, attempted: 0, correct: 0 };
      map[key].attempted++;
      if (isCorrect(q.id)) map[key].correct++;
    });
    return Object.values(map).map(x => Object.assign(x, { acc: pct(x.correct, x.attempted) }));
  }

  function pickContinueIds(subject, limit) {
    const un = subject.questions.filter(q => !attempted(q.id));
    const pool = un.length ? un : subject.questions;
    return pool.slice(0, limit).map(q => q.id);
  }

  /* ---------- 题库 ---------- */
  /* ---------- 套卷 ---------- */
  const PAPER_CAT = /真题|模拟|押题|套卷|回忆版|必刷题|模电选择题|数电选择题/;

  function renderPapers() {
    setActiveNav("papers");
    const groups = [];
    SUBJECTS.forEach(s => {
      const cats = unique(s.questions.map(q => q.category));
      cats.forEach(cat => {
        if (!PAPER_CAT.test(cat)) return;
        const qs = s.questions.filter(q => q.category === cat);
        if (qs.length < 5) return;
        const done = qs.filter(q => attempted(q.id)).length;
        const ok = qs.filter(q => isCorrect(q.id)).length;
        groups.push({ subject: s, cat: cat, qs: qs, done: done, ok: ok });
      });
    });
    groups.sort((a, b) => {
      if (a.subject.id !== b.subject.id) return SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject);
      return String(b.cat).localeCompare(String(a.cat), "zh-CN");
    });

    let html = '<div class="view">' +
      '<div class="page-head"><div><div class="eyebrow">Full Papers</div><h1>套卷练习</h1><p>按整套试卷作答，逐套记录完成度与正确率。真题、模拟卷、鸭哥必刷题与考点专项均可整卷练习。</p></div>' +
      '<div class="head-stat"><strong>' + groups.length + '</strong>套可练习试卷</div></div>';

    if (!groups.length) {
      html += '<div class="list-empty"><div class="big">暂无套卷数据</div><p>请先构建题库。</p></div>';
    } else {
      let lastSubject = "";
      groups.forEach((g, idx) => {
        if (g.subject.id !== lastSubject) {
          if (lastSubject) html += "</div></div>";
          html += '<div class="paper-section"><div class="paper-section-head"><div><h2>' + esc(g.subject.name) + '</h2>' +
            '<p>' + esc(g.subject.description || "") + '</p></div><span class="paper-pill">' + g.subject.questions.filter(q => PAPER_CAT.test(q.category)).length + ' 题</span></div><div class="paper-grid">';
          lastSubject = g.subject.id;
        }
        const pct = g.qs.length ? Math.round(g.done / g.qs.length * 100) : 0;
        const acc = g.done ? Math.round(g.ok / g.done * 100) : 0;
        html += '<article class="paper-card" style="--paper-color:' + esc(g.subject.color) + '">' +
          '<div class="paper-top"><div><div class="paper-title">' + esc(g.cat) + '</div><div class="paper-sub">' + esc(g.subject.name) + ' · ' + g.qs.length + ' 题</div></div>' +
          '<span class="paper-pill ' + (g.done === g.qs.length ? "done" : "") + '">' + (g.done === g.qs.length ? "已完成" : pct + "%") + '</span></div>' +
          '<div class="paper-meta"><span>已做 <strong>' + g.done + '</strong> / ' + g.qs.length + '</span><span>正确率 <strong>' + acc + '%</strong></span></div>' +
          '<div class="paper-bar"><span style="width:' + pct + '%"></span></div>' +
          '<div class="paper-actions"><button class="btn btn-primary btn-sm" data-paper-start="' + idx + '">' + icon("play") + (g.done ? '继续练习' : '开始做题') + '</button>' +
          '<button class="btn btn-outline btn-sm" data-paper-exam="' + idx + '">' + icon("flag") + '考试模式</button>' +
          '<button class="btn btn-ghost btn-sm" data-paper-bank="' + idx + '">看题目</button></div>' +
          '</article>';
      });
      html += "</div></div>";
    }
    html += "</div>";
    app.innerHTML = html;

    app.querySelectorAll("[data-paper-start]").forEach(btn => {
      btn.addEventListener("click", () => {
        const g = groups[Number(btn.getAttribute("data-paper-start"))];
        startPractice(g.qs.map(q => q.id), g.subject.name + " · " + g.cat, "practice", 0, null, { skipCompleted: true });
      });
    });
    app.querySelectorAll("[data-paper-exam]").forEach(btn => {
      btn.addEventListener("click", () => {
        const g = groups[Number(btn.getAttribute("data-paper-exam"))];
        if (!window.confirm("将以考试模式作答「" + g.cat + "」，共 " + g.qs.length + " 题，限时 " + MOCK_MINUTES + " 分钟，中途不显示对错，交卷后统一判分。开始？")) return;
        startPractice(g.qs.map(q => q.id), g.subject.name + " · " + g.cat + " · 考试", "exam", 0, { minutes: MOCK_MINUTES });
      });
    });
    app.querySelectorAll("[data-paper-bank]").forEach(btn => {
      btn.addEventListener("click", () => {
        const g = groups[Number(btn.getAttribute("data-paper-bank"))];
        bankFilter = { subject: g.subject.id, type: "all", category: g.cat, module: "all", chapter: "all", status: "all", difficulty: "all", search: "", page: 1 };
        location.hash = "#/bank";
      });
    });
    typeset(app);
    updateChrome();
  }

  /* ---------- 模拟考 ---------- */
  function renderMock() {
    setActiveNav("mock");
    stopMockTimer();
    const cache = loadMockCache();
    const active = cache && SMAP[cache.subjectId] ? cache : null;

    let html = '<div class="view">' +
      '<div class="page-head"><div><div class="eyebrow">Mock Exam</div><h1>模拟考</h1>' +
      '<p>按最近一年真题的题型分布随机组卷，限时 120 分钟。试卷与作答会缓存到本机浏览器，刷新或关掉页面后可以继续。</p></div>' +
      '<div class="head-stat"><strong>120</strong>分钟 / 场</div></div>';

    if (active) {
      const s = SMAP[active.subjectId];
      const answered = active.ids.filter(id => {
        const v = active.selections ? active.selections[id] : null;
        return Array.isArray(v) ? v.length > 0 : (v != null && String(v).trim() !== "");
      }).length;
      html += '<div class="mock-active">' +
        '<div class="mock-active-main"><span class="mock-pulse"></span><div><strong>有一场模拟考正在进行</strong><span>' + esc(s.name) + ' · 已答 ' + answered + ' / ' + active.ids.length + ' 题</span></div></div>' +
        '<div class="mock-active-right"><span class="mock-clock">剩余 ' + fmtClock(active.remainingMs) + '</span>' +
        '<button class="btn btn-primary btn-sm" data-mock-resume="' + active.subjectId + '">' + icon("play") + '继续作答</button>' +
        '<button class="btn btn-ghost btn-sm" data-mock-abandon="1">' + icon("trash") + '放弃</button></div>' +
      '</div>';
    }

    html += '<div class="mock-grid">' + SUBJECTS.map(s => {
      const tpl = paperTemplate(s);
      const total = tpl ? tpl.total : 32;
      const dist = tpl
        ? typeOrderOf(s.id).filter(t => tpl.dist[t]).map(t => typeNameOf(s.id, t) + " " + tpl.dist[t]).join(" · ")
        : "通用分布（选择题 20 · 多选题 5 · 判断题 5 · 填空题 5 · 解答题 2）";
      const isActive = active && active.subjectId === s.id;
      return '<article class="mock-card" style="--mock-color:' + esc(s.color) + '">' +
        '<div class="mock-top"><div class="mock-icon">' + icon(s.icon) + '</div>' +
          (isActive ? '<span class="paper-pill done">进行中</span>' : '<span class="paper-pill">' + total + ' 题</span>') + '</div>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p class="mock-desc">组卷依据：' + (tpl ? esc(tpl.category) + ' 的题型分布' + (tpl.ruled ? '（仅客观题：选择/填空/判断）' : '') : '通用题型分布') + '</p>' +
        '<div class="mock-dist">' + esc(dist) + '</div>' +
        '<div class="mock-meta"><span>' + icon("clock") + '120 分钟</span><span>' + icon("book") + total + ' 题</span></div>' +
        (isActive
          ? '<div class="mock-actions"><button class="btn btn-primary btn-sm" data-mock-resume="' + s.id + '">' + icon("play") + '继续作答</button>' +
            '<button class="btn btn-ghost btn-sm" data-mock-start="' + s.id + '">重新组卷</button></div>'
          : '<div class="mock-actions"><button class="btn btn-primary btn-sm" data-mock-start="' + s.id + '">' + icon("play") + '开始模拟考</button></div>') +
      '</article>';
    }).join("") + '</div>';

    html += '<div class="mock-note">' + icon("flag") + '<div>考试过程中不显示对错；交卷后统一判分，答错的题会自动进入错题本。倒计时结束自动交卷，未作答按错处理不入库。</div></div>';
    html += '</div>';

    app.innerHTML = html;

    app.querySelectorAll("[data-mock-start]").forEach(b => {
      b.addEventListener("click", () => {
        const sid = b.getAttribute("data-mock-start");
        const cur = loadMockCache();
        if (cur) {
          if (!window.confirm("本机已有一场未完成的模拟考（" + (SMAP[cur.subjectId] ? SMAP[cur.subjectId].name : "") + "），开始新考试会丢弃它，继续吗？")) return;
          clearMockCache();
        }
        startMockExam(sid, true);
      });
    });
    app.querySelectorAll("[data-mock-resume]").forEach(b => {
      b.addEventListener("click", () => {
        const c = loadMockCache();
        if (!c) { toast("没有可继续的模拟考", "no"); renderMock(); return; }
        resumeMock(c);
      });
    });
    const abandon = app.querySelector("[data-mock-abandon]");
    if (abandon) abandon.addEventListener("click", () => {
      if (!window.confirm("放弃后本场模拟考的作答记录会被清除，确定吗？")) return;
      clearMockCache();
      toast("已放弃本场模拟考");
      renderMock();
    });

    typeset(app);
    updateChrome();
  }

  function renderBank() {
    setActiveNav("bank");
    const selectedSubject = bankFilter.subject === "all" ? null : SMAP[bankFilter.subject];
    const isEnglish = !!(selectedSubject && selectedSubject.id === "english");
    const categories = unique(selectedSubject ? selectedSubject.questions.map(q => q.category) : ALL_QS.map(q => q.category));
    const chapters = unique(selectedSubject ? selectedSubject.questions.map(q => q.chapter) : ALL_QS.map(q => q.chapter));
    const pool = selectedSubject ? selectedSubject.questions : ALL_QS;
    const sections = unique(pool.filter(q => q.subjectId === "english").map(q => q.section || q.chapter));
    const modules = unique(selectedSubject ? selectedSubject.questions.map(q => q.module || "未分类") : ALL_QS.map(q => q.module || "未分类"));
    if (bankFilter.category !== "all" && !categories.includes(bankFilter.category)) bankFilter.category = "all";
    if (bankFilter.module !== "all" && !modules.includes(bankFilter.module)) bankFilter.module = "all";
    if (bankFilter.chapter !== "all" && !chapters.includes(bankFilter.chapter)) bankFilter.chapter = "all";
    if (isEnglish && bankFilter.section !== "all" && !sections.includes(bankFilter.section)) bankFilter.section = "all";
    const list = filteredQuestions();
    const shown = list.slice(0, bankFilter.page * PAGE_SIZE);

    app.innerHTML = '<div class="view">' +
      '<div class="page-head"><div><div class="eyebrow">Question Bank</div><h1>题库</h1><p>按科目、模块、年份、题型、章节筛选，随时开始一组练习。</p></div>' +
        '<div class="head-stat"><strong>' + list.length + '</strong>当前筛选题目</div></div>' +
      '<div class="filters">' +
        '<div class="filter-row"><span class="filter-label">科目</span><div class="segmented" id="subjectSeg">' +
          '<button data-subject="all" class="' + (bankFilter.subject === "all" ? "active" : "") + '">全部</button>' +
          SUBJECTS.map(s => '<button data-subject="' + s.id + '" class="' + (bankFilter.subject === s.id ? "active" : "") + '">' + esc(s.name) + '</button>').join("") +
        '</div></div>' +
        '<div class="filter-row"><span class="filter-label">筛选</span>' +
          '<select class="select" id="fType">' + optionsHtml(typeOptions(bankFilter.subject), bankFilter.type) + '</select>' +
          '<select class="select" id="fCategory">' + optionsHtml([["all","全部年份"]].concat(categories.map(c => [c, c])), bankFilter.category) + '</select>' +
          '<select class="select" id="fModule">' + optionsHtml([["all","全部模块"]].concat(modules.map(c => [c, c])), bankFilter.module) + '</select>' +
          (isEnglish
            ? '<select class="select" id="fSection">' + optionsHtml([["all","全部题型"]].concat(sections.map(c => [c, c])), bankFilter.section) + '</select>'
            : '<select class="select" id="fChapter">' + optionsHtml([["all","全部章节"]].concat(chapters.map(c => [c, c])), bankFilter.chapter) + '</select>') +
          '<select class="select" id="fDifficulty">' + optionsHtml([["all","全部难度"],["1","简单"],["2","中等"],["3","困难"]], bankFilter.difficulty || "all") + '</select>' +
          '<select class="select" id="fStatus">' + optionsHtml([["all","全部状态"],["new","未做过"],["done","已做过"],["correct","最近答对"],["wrong","最近答错"]], bankFilter.status) + '</select>' +
          '<div class="search-box">' + icon("search") + '<input id="fSearch" type="search" placeholder="搜索题干、题型或选项" value="' + esc(bankFilter.search) + '"></div>' +
        '</div>' +
        '<div class="filter-summary"><span>共 <strong>' + list.length + '</strong> 题' + (list.length > shown.length ? '，已显示 ' + shown.length + ' 题' : '') + (list.length > 100 ? '，单次练习取前 100 题' : '') + '</span>' +
          '<button class="btn btn-primary btn-sm" data-action="bank-start" ' + (list.length ? "" : "disabled") + '>' + icon("play") + '练习这组题</button>' +
          '<button class="btn btn-outline btn-sm" data-action="bank-exam" ' + (list.length ? "" : "disabled") + '>' + icon("flag") + '考试模式</button></div>' +
      '</div>' +
      (list.length ? '<div class="q-list">' + shown.map(bankRow).join("") + '</div>' :
        '<div class="list-empty"><div class="big">没有符合条件的题目</div><p>换一个筛选项，或清空搜索关键词再试试。</p><button class="btn btn-ghost btn-sm" data-action="reset-filter">清空筛选</button></div>') +
      (list.length > shown.length ? '<div class="load-more"><button class="btn btn-ghost" data-action="bank-more">加载更多（剩余 ' + (list.length - shown.length) + ' 题）</button></div>' : '') +
    '</div>';

    app.querySelectorAll("[data-subject]").forEach(btn => {
      btn.addEventListener("click", () => {
        const nextSubject = btn.getAttribute("data-subject");
        /* 切换科目时，若当前题型不属于该科目的题型体系，则重置为「全部题型」 */
        if (typeOptions(nextSubject).map(o => o[0]).indexOf(bankFilter.type) < 0) bankFilter.type = "all";
        bankFilter.subject = nextSubject;
        bankFilter.category = "all"; bankFilter.module = "all"; bankFilter.chapter = "all"; bankFilter.section = "all"; bankFilter.page = 1;
        renderBank();
      });
    });
    bindSelect("fType", v => { bankFilter.type = v; bankFilter.page = 1; });
    bindSelect("fCategory", v => { bankFilter.category = v; bankFilter.page = 1; });
    bindSelect("fModule", v => { bankFilter.module = v; bankFilter.page = 1; });
    if (isEnglish) bindSelect("fSection", v => { bankFilter.section = v; bankFilter.page = 1; });
    else bindSelect("fChapter", v => { bankFilter.chapter = v; bankFilter.page = 1; });
    bindSelect("fDifficulty", v => { bankFilter.difficulty = v; bankFilter.page = 1; });
    bindSelect("fStatus", v => { bankFilter.status = v; bankFilter.page = 1; });
    const search = document.getElementById("fSearch");
    if (search) {
      search.addEventListener("input", () => {
        bankFilter.search = search.value;
        bankFilter.page = 1;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          renderBank();
          const el = document.getElementById("fSearch");
          if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }, 220);
      });
    }
    const start = app.querySelector('[data-action="bank-start"]');
    if (start) start.addEventListener("click", () => {
      const picked = list.slice(0, 100);
      // 仅当未显式按状态筛选时才自动跳过已完成题；已按 done/correct/wrong 筛选则尊重该筛选
      const skip = (bankFilter.status === "all" || bankFilter.status === "new");
      startPractice(picked.map(q => q.id), "题库 · 筛选练习（" + picked.length + " 题）", "practice", 0, null, { skipCompleted: skip });
    });
    const exam = app.querySelector('[data-action="bank-exam"]');
    if (exam) exam.addEventListener("click", () => {
      const picked = list.slice(0, 100);
      const mins = examMinutes(picked.length);
      if (!window.confirm("将以考试模式作答当前筛选的 " + picked.length + " 题，限时 " + mins + " 分钟，中途不显示对错，交卷后统一判分。开始？")) return;
      startPractice(picked.map(q => q.id), "题库 · 筛选考试（" + picked.length + " 题）", "exam", 0, { minutes: mins });
    });
    const more = app.querySelector('[data-action="bank-more"]');
    if (more) more.addEventListener("click", () => { bankFilter.page++; renderBank(); });
    const reset = app.querySelector('[data-action="reset-filter"]');
    if (reset) reset.addEventListener("click", () => { bankFilter = { subject: "all", type: "all", category: "all", module: "all", chapter: "all", section: "all", status: "all", difficulty: "all", search: "", page: 1 }; renderBank(); });
    app.querySelectorAll("[data-qid]").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-qid");
        const q = QMAP[id];
        const ids = list.map(x => x.id);
        startPractice(ids, q.category + " · " + (SMAP[q.subjectId] ? SMAP[q.subjectId].name : ""), "practice", ids.indexOf(id));
      });
    });
    typeset(app);
    updateChrome();
  }

  function unique(arr) { return Array.from(new Set(arr)); }
  function optionsHtml(pairs, cur) {
    return pairs.map(([v, l]) => '<option value="' + esc(v) + '"' + (cur === v ? " selected" : "") + '>' + esc(l) + '</option>').join("");
  }
  function bindSelect(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => { fn(el.value); renderBank(); });
  }
  function filteredQuestions() {
    let list = ALL_QS.slice();
    if (bankFilter.subject !== "all") list = list.filter(q => q.subjectId === bankFilter.subject);
    if (bankFilter.type !== "all") list = list.filter(q => q.type === bankFilter.type);
    if (bankFilter.category !== "all") list = list.filter(q => q.category === bankFilter.category);
    if (bankFilter.module !== "all") list = list.filter(q => (q.module || "未分类") === bankFilter.module);
    if (bankFilter.chapter !== "all") list = list.filter(q => q.chapter === bankFilter.chapter);
    if (bankFilter.section !== "all") list = list.filter(q => (q.section || q.chapter) === bankFilter.section);
    if (bankFilter.difficulty && bankFilter.difficulty !== "all") list = list.filter(q => String(q.difficulty) === String(bankFilter.difficulty));
    if (bankFilter.status !== "all") {
      list = list.filter(q => {
        if (bankFilter.status === "new") return !attempted(q.id);
        if (bankFilter.status === "done") return attempted(q.id);
        if (bankFilter.status === "correct") return isCorrect(q.id);
        if (bankFilter.status === "wrong") return isWrong(q.id);
        return true;
      });
    }
    if (bankFilter.search.trim()) {
      const s = bankFilter.search.trim().toLowerCase();
      list = list.filter(q =>
        (q.stem + " " + classifyOf(q) + " " + q.category + " " + (q.module || "") + " " + q.options.map(o => o.text).join(" ")).toLowerCase().includes(s)
      );
    }
    return list;
  }
  function bankRow(q) {
    const s = SMAP[q.subjectId];
    const st = attempted(q.id) ? (isCorrect(q.id) ? "ok" : "no") : "new";
    const stText = st === "ok" ? "答对" : st === "no" ? "答错" : "未做";
    return '<div class="q-row" data-qid="' + q.id + '">' +
      '<div class="q-index">' + String(q.no).padStart(2, "0") + '</div>' +
      '<div class="q-main"><div class="q-meta"><span class="tag ' + TYPE_TAG[q.type] + '">' + typeNameOf(q.subjectId, q.type) + '</span>' + diffTag(q.difficulty) + '<span>' + esc(s.name) + '</span><span>·</span><span>' + esc(q.category) + '</span><span>·</span><span class="q-module">' + esc(q.module || "未分类") + '</span><span>·</span><span>' + esc(classifyOf(q)) + '</span></div>' +
        '<div class="q-stem">' + renderMD(previewStem(q.stem, 90), true) + '</div></div>' +
      '<div class="q-side"><span class="q-status ' + st + '"><span class="status-dot ' + (st === "ok" ? "correct" : st === "no" ? "wrong" : "") + '" style="display:inline-block;margin-right:5px"></span>' + stText + '</span><button class="btn btn-soft btn-sm" data-open="' + q.id + '">练习</button></div>' +
    '</div>';
  }

  /* ---------- 练习 / 考试 ---------- */
  function startPractice(ids, title, mode, startIndex, extra, opts) {
    ids = (ids || []).filter(id => QMAP[id]);
    const m = mode === "exam" || mode === "mock" ? mode : "practice";
    /* 练习模式（整组练习）：记录已完成题目，下次再练习自动跳过已完成题。
       单题练习 / 错题重做 / 考试 / 模拟考 不受影响。 */
    if (m === "practice" && opts && opts.skipCompleted) {
      const doneN = ids.filter(id => attempted(id)).length;
      const left = ids.filter(id => !attempted(id));
      if (left.length) {
        if (doneN) toast("已跳过 " + doneN + " 道已完成题，剩余 " + left.length + " 题", "no");
        ids = left;
      } else if (ids.length) {
        toast("本组题目已全部完成，已重置为全部题目供复习", "no");
      }
    }
    if (!ids.length) { toast("没有可练习的题目", "no"); return; }
    stopMockTimer();
    const from = (location.hash || "#/home").split("?")[0];
    practice = {
      ids, index: Math.max(0, Math.min(startIndex || 0, ids.length - 1)), title: title || "练习",
      mode: m, selections: {}, submitted: {}, results: {}, expanded: {}, startedAt: Date.now(),
      from
    };
    if (extra && extra.deadline) practice.deadline = extra.deadline;
    if (extra && extra.subjectId) practice.subjectId = extra.subjectId;
    if (m === "exam" && !practice.deadline) {
      practice.minutes = (extra && extra.minutes) || examMinutes(ids.length);
      practice.deadline = Date.now() + practice.minutes * 60000;
    }
    if (m === "mock" && practice.deadline) persistMockProgress();
    buildGroups(practice);
    practice.groupIndex = groupOf(practice.index);
    if (location.hash === "#/practice") renderPractice(); else location.hash = "#/practice";
  }

  function currentQ() { return practice ? QMAP[practice.ids[practice.index]] : null; }
  /* 把练习题目按「同源篇章」分成若干组：共享同一 passageId 的连续题目合为一组，
     其余每题自成一组。篇章只在第一题处渲染一次（见 renderPractice）。不重排题目顺序，
     以保留套卷/考试/模拟考的固有卷面顺序。 */
  function buildGroups(p) {
    const ids = p.ids, groups = [];
    let i = 0;
    while (i < ids.length) {
      const pid = QMAP[ids[i]] && QMAP[ids[i]].passageId;
      let j = i + 1;
      if (pid) { while (j < ids.length && QMAP[ids[j]] && QMAP[ids[j]].passageId === pid) j++; }
      groups.push({ passageId: pid || null, start: i, end: j - 1 });
      i = j;
    }
    p.groups = groups;
  }
  function groupOf(idx) {
    if (!practice || !practice.groups) return 0;
    for (let k = 0; k < practice.groups.length; k++) {
      const g = practice.groups[k];
      if (idx >= g.start && idx <= g.end) return k;
    }
    return 0;
  }
  function gotoGroup(gi) {
    if (!practice || !practice.groups) return;
    gi = Math.max(0, Math.min(gi, practice.groups.length - 1));
    practice.groupIndex = gi;
    practice.index = practice.groups[gi].start;
    persistMockProgress();
    renderPractice();
  }

  function answeredCount() {
    if (!practice) return 0;
    return practice.ids.filter(id => hasAnswered(id)).length;
  }
  function hasAnswered(id) {
    const v = practice.selections[id];
    if (Array.isArray(v)) return v.length > 0;
    return v != null && String(v).trim() !== "";
  }

  function renderPractice() {
    if (!practice) { location.hash = "#/bank"; return; }
    setActiveNav(practice.mode === "mock" ? "mock" : "bank");
    if (!practice.groups) buildGroups(practice);
    if (practice.groupIndex == null || practice.groupIndex < 0 || practice.groupIndex >= practice.groups.length) practice.groupIndex = 0;
    const g = practice.groups[practice.groupIndex];
    const q0 = QMAP[practice.ids[g.start]];
    if (!q0) { location.hash = "#/bank"; return; }
    const s = SMAP[q0.subjectId];
    const exam = isExam();
    const total = practice.groups.length;
    const pos = practice.groupIndex + 1;
    const doneN = exam ? answeredCount() : Object.keys(practice.results).length;
    const modeLabel = practice.mode === "mock" ? "模拟考" : practice.mode === "exam" ? "考试" : "练习";
    const limitMin = practice.mode === "mock" ? MOCK_MINUTES : (practice.minutes || 0);
    const passageText = (g.passageId && s.passages && s.passages[g.passageId]) ? s.passages[g.passageId] : null;
    const expanded = !!practice.expanded[practice.groupIndex];

    let card = "";
    if (passageText) {
      card += '<div class="passage-box' + (expanded ? " expanded" : "") + '">' +
        '<div class="passage-head"><span>阅读材料</span><button class="btn btn-soft btn-sm" data-action="toggle-passage">' + (expanded ? "收起" : "展开全文") + '</button></div>' +
        '<div class="passage-body">' + esc(passageText) + '</div></div>';
    }
    for (let k = g.start; k <= g.end; k++) {
      const q = QMAP[practice.ids[k]];
      if (q) card += subCard(q, k === g.start);
    }

    app.innerHTML = '<div class="view">' +
      '<div class="practice-head">' +
        '<button class="practice-back" data-action="exit-practice">' + icon("back") + '退出' + modeLabel + '</button>' +
        '<div class="practice-title"><strong>' + esc(practice.title) + '</strong><span>' + esc(s.name) + ' · ' + esc(q0.category) + ' · ' + esc(classifyOf(q0)) + '</span></div>' +
        (exam && practice.deadline ? '<div class="mock-clock" id="mockClock">' + fmtClock(practice.deadline - Date.now()) + '</div>' : '') +
        '<div class="practice-progress"><span>' + pos + ' / ' + total + ' 组</span><div class="track"><i style="width:' + pct(pos, total) + '%"></i></div></div>' +
      '</div>' +
      (exam ? '<div class="exam-banner">' + icon("flag") + '考试模式：限时 ' + limitMin + ' 分钟，作答期间不显示对错，交卷后统一判分并计入错题本。</div>' : '') +
      '<div class="practice-nav">' +
        '<button class="btn btn-ghost" data-action="prev"' + (practice.groupIndex === 0 ? " disabled" : "") + '>' + icon("back") + '上一组</button>' +
        '<div class="practice-nav-right">' +
          (exam ? '' : '<button class="btn btn-dark" data-action="finish-practice">' + icon("check") + '完成练习</button>') +
          (practice.groupIndex === practice.groups.length - 1 ? '' : '<button class="btn btn-dark" data-action="next">下一组' + icon("arrow") + '</button>') +
        '</div>' +
      '</div>' +
      '<div class="practice-layout">' +
        '<div class="question-card" id="questionCard">' + card + '</div>' +
        '<aside class="answer-sheet">' +
          '<div class="sheet-head"><strong>答题卡</strong><span>' + doneN + ' / ' + practice.ids.length + ' 已作答</span></div>' +
          '<div class="sheet-grid">' + practice.ids.map((id, i) => sheetCell(id, i)).join("") + '</div>' +
          (exam
            ? '<div class="sheet-legend"><span><i style="background:var(--primary)"></i>当前</span><span><i style="background:var(--green)"></i>已答</span><span><i style="background:rgba(29,36,50,.12)"></i>未答</span></div>'
            : '<div class="sheet-legend"><span><i style="background:var(--primary)"></i>当前</span><span><i style="background:var(--green)"></i>答对</span><span><i style="background:var(--red)"></i>答错</span><span><i style="background:var(--amber)"></i>自评</span></div>') +
          '<div class="sheet-tip">' + (exam ? '考试模式下可以自由跳转修改答案，交卷前不判分。' : '点击题号可跳转；未提交的题目不会计入进度。') + '</div>' +
          (exam
            ? '<button class="btn btn-primary btn-sm sheet-exit" data-action="submit-exam">' + icon("check") + '交卷并查看成绩</button>'
            : '<button class="btn btn-ghost btn-sm sheet-exit" data-action="finish-practice">' + icon("check") + '结束并查看小结</button>') +
        '</aside>' +
      '</div>' +
    '</div>';

    bindPractice();
    typeset(app);
    updateChrome();
    if (isExam() && practice.deadline) startMockTimer(); else stopMockTimer();
    scrollTop(false);
  }

  /* 单题卡片：不再包含篇章框（由 renderPractice 在组首统一渲染一次），
     也不再含分组级的上一组/下一组/交卷按钮；每题仅带自己的「提交答案」按钮 */
  function subCard(q, isFirst) {
    const s = SMAP[q.subjectId];
    const answer = practice.selections[q.id];
    const submitted = !!practice.submitted[q.id];
    let body = "";
    body += '<div class="sub-q' + (isFirst ? " first" : "") + '" data-qid="' + q.id + '">';
    body += '<div class="q-topline"><span class="q-number">第 ' + q.no + ' 题</span>' +
      '<span class="tag ' + TYPE_TAG[q.type] + '">' + typeNameOf(q.subjectId, q.type) + '</span>' +
      diffTag(q.difficulty) +
      '<span class="tag tag-gray">' + esc(classifyOf(q)) + '</span>' +
      '<span class="q-source">' + esc(q.source || q.category) + '</span></div>';
    body += '<div class="q-stem-full">' + renderMD(q.stem, false, true) + '</div>';
    body += questionImage(q);

    if (isTextAnswer(q)) {
      body += '<div class="solution-wrap"><div class="fill-label">我的解答（可只写关键步骤，提交后对照参考答案自评）</div>' +
        '<textarea class="solution-input" id="sol-' + q.id + '" data-qid="' + q.id + '" placeholder="在这里写下你的思路或答案……"' + (submitted ? " disabled" : "") + '>' + esc(answer || "") + '</textarea>' +
        '<div class="self-judge" id="selfJudge-' + q.id + '"></div></div>';
    } else if (q.type === "fill") {
      body += '<div class="fill-wrap"><div class="fill-label">请填写答案</div>' +
        '<input class="fill-input" id="fill-' + q.id + '" data-qid="' + q.id + '" type="text" autocomplete="off" spellcheck="false" placeholder="输入答案，支持分数、根号、π 等写法" value="' + esc(answer || "") + '"' + (submitted ? " disabled" : "") + '>' +
        '<div class="fill-hint">填空判分已做常见写法归一化；若表达式特殊，可在答案区手动核对。</div></div>';
    } else {
      const selected = q.type === "multiple" ? (Array.isArray(answer) ? answer : []) : (answer ? [answer] : []);
      const ck = correctKeys(q);
      body += '<div class="options">' + (q.options || []).map(o => {
        const isSel = selected.includes(o.key);
        let cls = "option";
        if (isSel) cls += " selected";
        if (submitted) {
          cls += " disabled";
          if (ck.includes(o.key)) cls += " correct";
          else if (isSel) cls += " wrong";
        }
        return '<button class="' + cls + '" data-opt="' + esc(o.key) + '" data-qid="' + q.id + '"' + (submitted ? " disabled" : "") + '>' +
          '<span class="option-key">' + esc(o.key) + '</span><span class="option-text">' + renderMD(o.text, true) + '</span>' +
          (submitted && ck.includes(o.key) ? '<span class="opt-mark">正确答案</span>' : (submitted && isSel ? '<span class="opt-mark">你的选择</span>' : "")) +
          '</button>';
      }).join("") + '</div>';
    }

    if (submitted) body += resultPanel(q);
    if (!isExam() && !submitted) {
      body += '<div class="q-actions">' +
        '<button class="btn btn-primary btn-sm" data-action="submit" data-qid="' + q.id + '">' + (isTextAnswer(q) ? "查看参考答案" : "提交答案") + '</button>' +
        '</div>';
    }
    body += '</div>';
    return body;
  }

  function resultPanel(q) {
    const result = practice.results[q.id];
    const submitted = practice.submitted[q.id];
    let cls = "neutral", label = "参考答案已展开", sub = "请对照参考答案自行判断";
    if (result === "correct") { cls = "ok"; label = "回答正确"; sub = "已记录为答对"; }
    else if (result === "wrong") { cls = "no"; label = "回答错误"; sub = "已自动加入错题本"; }
    const ic = result === "correct" ? "check" : result === "wrong" ? "x" : "eye";
    let answerLine = "";
    if (q.type === "fill") {
      answerLine = '<div class="result-answer">正确答案：<strong>' + (q.answerDisplay || renderMD("`" + (q.answers || []).join(" / ") + "`", true)) + '</strong>' +
        (practice.selections[q.id] ? '　你的答案：<strong>' + esc(practice.selections[q.id]) + '</strong>' : "") + '</div>';
    } else if (isTextAnswer(q)) {
      answerLine = '<div class="result-answer"><strong>参考答案：</strong>' + renderMD(q.answerText || "见解析。") + '</div>';
    } else {
      const ua = practice.selections[q.id];
      const uaText = Array.isArray(ua) ? ua.map(k => choiceLabel(q, k)).join("") : choiceLabel(q, ua);
      answerLine = '<div class="result-answer">正确答案：<strong>' + esc(choiceLabel(q, q.answer)) + '</strong>　你的答案：<strong>' + esc(uaText) + '</strong></div>';
    }
    const selfBtns = isTextAnswer(q) && !result
      ? '<div class="self-judge"><button class="btn btn-soft btn-sm" data-action="self-correct" data-qid="' + q.id + '">' + icon("check") + '我做对了</button><button class="btn btn-danger btn-sm" data-action="self-wrong" data-qid="' + q.id + '">' + icon("x") + '我做错了</button></div>'
      : "";
    return '<div class="result-panel ' + cls + '">' +
      '<div class="result-banner"><span class="icon">' + icon(ic) + '</span><span>' + label + '<span style="font-weight:400;opacity:.72;margin-left:8px;font-size:11px">' + sub + '</span></span></div>' +
      answerLine + selfBtns +
      '<div class="analysis"><div class="analysis-title">答案解析</div>' + renderMD(q.explanation || "暂无详细解析。") + '</div></div>';
  }

  function sheetCell(id, i) {
    const res = practice.results[id];
    let cls = "sheet-cell";
    if (i === practice.index) cls += " current";
    else if (isExam()) { if (hasAnswered(id)) cls += " answered"; }
    else if (res === "correct") cls += " correct";
    else if (res === "wrong") cls += " wrong";
    else if (practice.submitted[id]) cls += " self";
    return '<button class="' + cls + '" data-jump="' + i + '">' + (i + 1) + '</button>';
  }

  function bindPractice() {
    /* 选项点击：按 data-qid 定位到具体题目 */
    app.querySelectorAll("[data-opt]").forEach(btn => {
      btn.addEventListener("click", () => {
        const qid = btn.getAttribute("data-qid");
        const q = QMAP[qid];
        if (!q || practice.submitted[qid]) return;
        const key = btn.getAttribute("data-opt");
        if (q.type === "multiple") {
          let arr = Array.isArray(practice.selections[qid]) ? practice.selections[qid].slice() : [];
          if (arr.includes(key)) arr = arr.filter(k => k !== key); else arr.push(key);
          arr.sort();
          practice.selections[qid] = arr;
        } else {
          practice.selections[qid] = key;
        }
        updateOptionUI(qid);
        persistMockProgress();
        if (isExam()) refreshExamChrome();
      });
    });
    /* 填空 / 作文 输入 */
    app.querySelectorAll(".fill-input, .solution-input").forEach(inp => {
      const qid = inp.getAttribute("data-qid");
      inp.addEventListener("input", () => { practice.selections[qid] = inp.value; persistMockProgress(); });
    });
    /* 分组级动作 */
    app.querySelectorAll("[data-action]").forEach(el => {
      const a = el.getAttribute("data-action");
      if (a === "submit") el.addEventListener("click", () => submitOne(el.getAttribute("data-qid")));
      if (a === "submit-exam") el.addEventListener("click", () => submitExam(false));
      if (a === "prev") el.addEventListener("click", () => gotoGroup(practice.groupIndex - 1));
      if (a === "next") el.addEventListener("click", () => gotoGroup(practice.groupIndex + 1));
      if (a === "exit-practice") el.addEventListener("click", exitPractice);
      if (a === "finish-practice") el.addEventListener("click", finishPractice);
      if (a === "self-correct") el.addEventListener("click", () => judgeOne(el.getAttribute("data-qid"), true));
      if (a === "self-wrong") el.addEventListener("click", () => judgeOne(el.getAttribute("data-qid"), false));
      if (a === "toggle-passage") el.addEventListener("click", () => {
        practice.expanded[practice.groupIndex] = !practice.expanded[practice.groupIndex];
        renderPractice();
      });
    });
    app.querySelectorAll("[data-jump]").forEach(el => {
      el.addEventListener("click", () => gotoQuestion(parseInt(el.getAttribute("data-jump"), 10)));
    });
  }

  /* 考试模式下题目跳转不重绘整页，避免输入框失焦；这里只刷新答题卡状态 */
  function refreshExamChrome() {
    const sheet = app.querySelector(".sheet-head span");
    if (sheet) sheet.textContent = answeredCount() + " / " + practice.ids.length + " 已作答";
    app.querySelectorAll("[data-jump]").forEach(el => {
      const i = parseInt(el.getAttribute("data-jump"), 10);
      const id = practice.ids[i];
      el.classList.toggle("answered", i !== practice.index && hasAnswered(id));
    });
  }

  function updateOptionUI(qid) {
    const q = QMAP[qid];
    if (!q) return;
    const answer = practice.selections[qid];
    const selected = q.type === "multiple" ? (Array.isArray(answer) ? answer : []) : (answer ? [answer] : []);
    const sub = app.querySelector('.sub-q[data-qid="' + qid + '"]');
    if (!sub) return;
    sub.querySelectorAll("[data-opt]").forEach(btn => {
      btn.classList.toggle("selected", selected.includes(btn.getAttribute("data-opt")));
    });
  }

  function submitOne(id) {
    const q = QMAP[id];
    if (!q || practice.submitted[id]) return;
    const user = practice.selections[id];
    if (isTextAnswer(q)) {
      practice.submitted[id] = true;
      renderPractice();
      return;
    }
    if (q.type === "fill" && (!user || !String(user).trim())) { toast("请先填写答案", "no"); return; }
    if ((q.type === "single" || q.type === "multiple" || q.type === "judgment") && (!user || (Array.isArray(user) && !user.length))) { toast("请先选择答案", "no"); return; }
    const ok = q.type === "fill" ? checkFill(q, user) : checkChoice(q, user);
    practice.submitted[id] = true;
    practice.results[id] = ok ? "correct" : "wrong";
    recordAnswer(q, ok ? "correct" : "wrong", user);
    renderPractice();
    toast(ok ? "回答正确" : "回答错误，已加入错题本", ok ? "ok" : "no");
  }
  function submitCurrent() { const q = currentQ(); if (q) submitOne(q.id); }

  function judgeOne(id, ok) {
    const q = QMAP[id];
    if (!q || q.type !== "solution" || practice.results[id]) return;
    practice.results[id] = ok ? "correct" : "wrong";
    recordAnswer(q, ok ? "correct" : "wrong", practice.selections[id] || "");
    renderPractice();
    toast(ok ? "已记录为答对" : "已加入错题本", ok ? "ok" : "no");
  }
  function judgeSolution(ok) { const q = currentQ(); if (q) judgeOne(q.id, ok); }

  function gotoQuestion(idx) {
    if (!practice || !practice.groups) return;
    if (idx < 0 || idx >= practice.ids.length) return;
    practice.index = idx;
    practice.groupIndex = groupOf(idx);
    persistMockProgress();
    renderPractice();
  }

  /* 退出/完成练习后返回的来源页面：优先回到进入练习前的页面（保留滚动位置），
     模拟考固定回模拟考页；其他模式回记录下来的来源页，退化时回题库 */
  function practiceBackHash() {
    if (practice && practice.mode === "mock") return "#/mock";
    const f = practice && practice.from;
    if (f && f !== "#/practice") return f;
    return "#/bank";
  }

  function exitPractice() {
    if (!practice) { location.hash = "#/home"; return; }
    const exam = isExam();
    if (exam) {
      const msg = practice.mode === "mock"
        ? "退出后本次模拟考的作答与倒计时会保留在本机，可从「模拟考」页继续。确定退出？"
        : "退出后本次考试的作答与倒计时都会丢失，确定退出？";
      if (!window.confirm(msg)) return;
    }
    stopMockTimer();
    persistMockProgress();
    location.hash = practiceBackHash();
  }

  /* 交卷：统一判分，答错自动进错题本 */
  function submitExam(auto) {
    if (!practice || !isExam()) return;
    const unanswered = practice.ids.filter(id => !hasAnswered(id)).length;
    if (!auto && unanswered > 0 && !window.confirm("还有 " + unanswered + " 题未作答，确定交卷吗？")) return;
    stopMockTimer();
    practice.ids.forEach(id => {
      if (!hasAnswered(id)) return;
      const q = QMAP[id];
      if (!q) return;
      practice.submitted[id] = true;
      if (isTextAnswer(q)) return; // 解答题/计算题交卷后自评
      const ok = q.type === "fill" ? checkFill(q, practice.selections[id]) : checkChoice(q, practice.selections[id]);
      practice.results[id] = ok ? "correct" : "wrong";
      recordAnswer(q, ok ? "correct" : "wrong", practice.selections[id]);
    });
    practice.finished = true;
    if (practice.mode === "mock") clearMockCache();
    location.hash = "#/summary";
    renderSummary();
  }

  function recordAnswer(q, result, userAnswer) {
    const now = Date.now();
    const p = state.progress[q.id] || { attempts: 0, correct: 0, firstAt: now };
    p.attempts++;
    if (result === "correct") p.correct++;
    p.lastResult = result;
    p.lastAt = now;
    p.lastAnswer = Array.isArray(userAnswer) ? userAnswer.join("") : (userAnswer || "");
    state.progress[q.id] = p;
    if (result === "wrong") {
      const w = state.wrong[q.id] || { count: 0, firstAt: now, mastered: false };
      w.count++;
      w.lastAt = now;
      w.mastered = false;
      state.wrong[q.id] = w;
    } else if (state.wrong[q.id]) {
      state.wrong[q.id].mastered = true;
      state.wrong[q.id].masteredAt = now;
    }
    state.history.push({ qid: q.id, result, at: now, self: isTextAnswer(q) ? true : undefined });
    if (state.history.length > 400) state.history = state.history.slice(-400);
    state.lastSubject = q.subjectId;
    saveState();
    updateChrome();
  }

  function finishPractice() {
    if (!practice) return;
    practice.finished = true;
    location.hash = "#/summary";
    renderSummary();
  }

  function renderSummary() {
    if (!practice) { location.hash = "#/bank"; return; }
    const exam = isExam();
    const backHash = practiceBackHash();
    const backLabel = { "#/bank": "题库", "#/papers": "套卷", "#/home": "首页", "#/wrong": "错题本", "#/progress": "学习进度" }[backHash] || "题库";
    setActiveNav(practice.mode === "mock" ? "mock" : backHash.slice(2));
    const attemptedIds = practice.ids.filter(id => practice.results[id]);
    const correct = attemptedIds.filter(id => practice.results[id] === "correct").length;
    const wrongIds = attemptedIds.filter(id => practice.results[id] === "wrong");
    const pendingIds = exam ? practice.ids.filter(id => practice.submitted[id] && !practice.results[id]) : [];
    const unanswered = practice.ids.length - practice.ids.filter(id => practice.submitted[id] || practice.results[id]).length;
    const scored = exam ? attemptedIds.length + pendingIds.length : attemptedIds.length;
    const acc = pct(correct, exam ? Math.max(0, scored - pendingIds.length) : attemptedIds.length);
    const usedMin = Math.max(1, Math.round((Date.now() - (practice.startedAt || Date.now())) / 60000));
    const title = exam ? (practice.mode === "mock" ? "模拟考已交卷" : "考试已交卷") : "本组练习完成";
    const head = exam ? '<strong>' + correct + '</strong><span>答对 / 共 ' + practice.ids.length + ' 题</span>'
      : '<strong>' + acc + '%</strong><span>正确率</span>';
    app.innerHTML = '<div class="view summary">' +
      '<div class="summary-card">' +
        '<div class="summary-badge">' + icon("check") + '</div>' +
        '<h1>' + title + '</h1>' +
        '<p class="summary-desc">' + esc(practice.title) + ' · 共 ' + practice.ids.length + ' 题' + (exam ? ' · 用时 ' + usedMin + ' 分钟' : '') + '</p>' +
        '<div class="summary-stats">' +
          (exam
            ? '<div class="summary-stat">' + head + '</div>' +
              '<div class="summary-stat"><strong>' + unanswered + '</strong><span>未作答</span></div>' +
              '<div class="summary-stat"><strong>' + acc + '%</strong><span>正确率</span></div>'
            : '<div class="summary-stat"><strong>' + attemptedIds.length + '</strong><span>已作答</span></div>' +
              '<div class="summary-stat"><strong>' + correct + '</strong><span>答对</span></div>' +
              '<div class="summary-stat"><strong>' + acc + '%</strong><span>正确率</span></div>') +
        '</div>' +
        '<div class="summary-actions">' +
          (wrongIds.length ? '<button class="btn btn-primary" data-action="redo-wrong">' + icon("refresh") + '重做本组错题</button>' : '') +
          (practice.mode === "mock" ? '<a class="btn btn-ghost" href="#/mock">返回模拟考</a>' : '<a class="btn btn-ghost" href="' + backHash + '">返回' + backLabel + '</a>') +
          '<a class="btn btn-ghost" href="#/wrong">查看错题本</a>' +
        '</div>' +
        (pendingIds.length ? '<div class="summary-list"><h3>待自评解答题（' + pendingIds.length + '）</h3>' + pendingIds.map(id => {
          const q = QMAP[id];
          return '<div class="summary-wrong pending-item" data-pending="' + id + '"><span>第' + q.no + '题</span><div>' + renderMD(previewStem(q.stem, 60), true) + '</div>' +
            '<div class="self-judge"><button class="btn btn-soft btn-sm" data-self-ok="' + id + '">' + icon("check") + '做对了</button><button class="btn btn-danger btn-sm" data-self-no="' + id + '">' + icon("x") + '做错了</button></div></div>';
        }).join("") + '</div>' : '') +
        (wrongIds.length ? '<div class="summary-list"><h3>' + (exam ? "答错题目" : "本组错题") + '</h3>' + wrongIds.map(id => {
          const q = QMAP[id];
          return '<div class="summary-wrong"><span>第' + q.no + '题</span><div>' + renderMD(previewStem(q.stem, 70), true) + '</div></div>';
        }).join("") + '</div>' : '') +
      '</div></div>';
    const redo = app.querySelector('[data-action="redo-wrong"]');
    if (redo) redo.addEventListener("click", () => startPractice(wrongIds, "重做本组错题", "wrong"));
    app.querySelectorAll("[data-self-ok]").forEach(b => b.addEventListener("click", () => selfJudgePending(b.getAttribute("data-self-ok"), true)));
    app.querySelectorAll("[data-self-no]").forEach(b => b.addEventListener("click", () => selfJudgePending(b.getAttribute("data-self-no"), false)));
    typeset(app);
    updateChrome();
  }

  function selfJudgePending(qid, ok) {
    const q = QMAP[qid];
    if (!q || !practice) return;
    practice.results[qid] = ok ? "correct" : "wrong";
    recordAnswer(q, ok ? "correct" : "wrong", practice.selections[qid] || "");
    renderSummary();
    toast(ok ? "已记为答对" : "已记为答错并加入错题本", ok ? "ok" : "no");
  }

  /* ---------- 错题本 ---------- */
  function renderWrong() {
    setActiveNav("wrong");
    let entries = Object.keys(state.wrong).map(id => {
      const q = QMAP[id];
      return q ? { q, w: state.wrong[id] } : null;
    }).filter(Boolean).sort((a, b) => (b.w.lastAt || 0) - (a.w.lastAt || 0));
    if (wrongFilter !== "all") entries = entries.filter(e => e.q.subjectId === wrongFilter);
    const total = Object.keys(state.wrong).filter(id => QMAP[id]).length;
    const unmastered = Object.values(state.wrong).filter(w => !w.mastered).length;
    const mastered = total - unmastered;

    app.innerHTML = '<div class="view">' +
      '<div class="page-head"><div><div class="eyebrow">Mistake Notebook</div><h1>错题本</h1><p>答错自动收录；重做答对后标记为已掌握，也可以手动移出。</p></div>' +
        '<div class="head-stat"><strong>' + unmastered + '</strong>待巩固错题</div></div>' +
      '<div class="wrong-stats">' +
        '<div class="stat-card"><span>错题总数</span><strong>' + total + '<small>题</small></strong></div>' +
        '<div class="stat-card"><span>待巩固</span><strong style="color:var(--red)">' + unmastered + '<small>题</small></strong></div>' +
        '<div class="stat-card"><span>已掌握</span><strong style="color:var(--green)">' + mastered + '<small>题</small></strong></div>' +
      '</div>' +
      '<div class="wrong-toolbar">' +
        '<div class="segmented"><button data-wfilter="all" class="' + (wrongFilter === "all" ? "active" : "") + '">全部</button>' +
          SUBJECTS.map(s => '<button data-wfilter="' + s.id + '" class="' + (wrongFilter === s.id ? "active" : "") + '">' + esc(s.name) + '</button>').join("") + '</div>' +
        '<button class="btn btn-primary btn-sm" data-action="wrong-redo" ' + (unmastered ? "" : "disabled") + '>' + icon("refresh") + '重做全部错题</button>' +
      '</div>' +
      (entries.length ? '<div class="wrong-list">' + entries.map(wrongItem).join("") + '</div>' :
        '<div class="list-empty"><div class="big">错题本是空的</div><p>做题时答错的题会自动出现在这里。' + (mastered ? "当前错题都已掌握。" : "") + '</p><a class="btn btn-ghost btn-sm" href="#/bank">去题库练习</a></div>') +
    '</div>';

    app.querySelectorAll("[data-wfilter]").forEach(btn => {
      btn.addEventListener("click", () => { wrongFilter = btn.getAttribute("data-wfilter"); renderWrong(); });
    });
    const redo = app.querySelector('[data-action="wrong-redo"]');
    if (redo) redo.addEventListener("click", () => {
      const ids = entries.filter(e => !e.w.mastered).map(e => e.q.id);
      startPractice(ids, "错题重做", "wrong");
    });
    app.querySelectorAll("[data-action='redo-one']").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); startPractice([btn.getAttribute("data-qid")], "错题重做", "wrong"); });
    });
    app.querySelectorAll("[data-action='remove-wrong']").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        delete state.wrong[btn.getAttribute("data-qid")];
        saveState(); renderWrong(); updateChrome(); toast("已移出错题本");
      });
    });
    app.querySelectorAll("[data-action='detail']").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); showQuestionModal(btn.getAttribute("data-qid")); });
    });
    typeset(app);
    updateChrome();
  }

  function wrongItem(entry) {
    const q = entry.q, w = entry.w, s = SMAP[q.subjectId];
    return '<div class="wrong-item' + (w.mastered ? " mastered" : "") + '">' +
      '<div><div class="wrong-meta"><span class="tag ' + TYPE_TAG[q.type] + '">' + typeNameOf(q.subjectId, q.type) + '</span><span>' + esc(s.name) + '</span><span>·</span><span>' + esc(q.category) + '</span><span>·</span><span>' + esc(classifyOf(q)) + '</span>' + (w.mastered ? '<span class="tag tag-green">已掌握</span>' : '') + '</div>' +
        '<div class="wrong-stem">' + renderMD(previewStem(q.stem, 100), true) + '</div>' +
        '<div class="wrong-info"><span>错 <b>' + w.count + '</b> 次</span><span>最近 ' + timeAgo(w.lastAt) + '</span></div></div>' +
      '<div class="wrong-actions">' +
        '<button class="btn btn-soft" data-action="redo-one" data-qid="' + q.id + '">' + icon("refresh") + '重做</button>' +
        '<button class="btn btn-ghost" data-action="detail" data-qid="' + q.id + '">' + icon("eye") + '看解析</button>' +
        '<button class="btn btn-ghost" data-action="remove-wrong" data-qid="' + q.id + '">' + icon("trash") + '移出</button>' +
      '</div></div>';
  }

  /* ---------- 题目详情弹层 ---------- */
  function showQuestionModal(qid) {
    const q = QMAP[qid];
    if (!q) return;
    const s = SMAP[q.subjectId];
    let answerHtml = "";
    if (q.type === "fill") answerHtml = '<div class="result-answer">正确答案：<strong>' + (q.answerDisplay || esc((q.answers || []).join(" / "))) + '</strong></div>';
    else if (isTextAnswer(q)) answerHtml = '<div class="result-answer"><strong>参考答案：</strong>' + renderMD(q.answerText || "见解析。") + '</div>';
    else answerHtml = '<div class="result-answer">正确答案：<strong>' + esc(choiceLabel(q, q.answer)) + '</strong></div>';
    const opts = q.options && q.options.length ? '<div class="options">' + q.options.map(o => {
      const ok = q.answer && q.answer.includes(o.key);
      return '<div class="option disabled' + (ok ? " correct" : "") + '"><span class="option-key">' + esc(o.key) + '</span><span class="option-text">' + renderMD(o.text, true) + '</span>' + (ok ? '<span class="opt-mark">正确答案</span>' : "") + '</div>';
    }).join("") + '</div>' : "";
    const passage = q.passageId && s.passages && s.passages[q.passageId]
      ? '<div class="passage-box expanded"><div class="passage-head"><span>阅读材料</span></div><div class="passage-body">' + esc(s.passages[q.passageId]) + '</div></div>' : "";
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><div><strong>' + esc(s.name) + ' · 第 ' + q.no + ' 题</strong><span>' + esc(q.category) + ' · ' + esc(classifyOf(q)) + '</span></div><button class="icon-btn" data-close aria-label="关闭">' + icon("x") + '</button></div>' +
      '<div class="modal-body">' + passage + '<div class="q-stem-full">' + renderMD(q.stem, false, true) + '</div>' + questionImage(q) + opts + answerHtml +
      '<div class="analysis"><div class="analysis-title">答案解析</div>' + renderMD(q.explanation || "暂无详细解析。") + '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-primary" data-redo>练习这道题</button><button class="btn btn-ghost" data-close>关闭</button></div>' +
    '</div>';
    document.body.appendChild(overlay);
    typeset(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    overlay.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
    const redo = overlay.querySelector("[data-redo]");
    if (redo) redo.addEventListener("click", () => { close(); startPractice([q.id], "单题练习", "practice"); });
    const onKey = e => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
  }

  /* 图片放大查看（电路图等） */
  function showImageZoom(src, alt) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay image-zoom-overlay";
    overlay.innerHTML = '<div class="image-zoom">' +
      '<button class="icon-btn" data-close aria-label="关闭">' + icon("x") + '</button>' +
      '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '">' +
      '</div>';
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", e => { if (e.target === overlay || e.target.closest("[data-close]")) close(); });
    const onKey = e => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
    document.addEventListener("keydown", onKey);
  }

  /* ---------- 进度 ---------- */
  function renderProgress() {
    setActiveNav("progress");
    const done = overallDone();
    const percent = pct(done, TOTAL);
    const attempts = Object.values(state.progress).reduce((a, p) => a + (p.attempts || 0), 0);
    const correct = Object.values(state.progress).reduce((a, p) => a + (p.correct || 0), 0);
    const acc = pct(correct, attempts);
    const wrongN = unmasteredWrongIds().length;
    const streak = calcStreak();
    const stats = chapterStats().sort((a, b) => b.attempted - a.attempted || a.acc - b.acc);
    const recent = state.history.slice(-8).reverse().filter(h => QMAP[h.qid]);

    app.innerHTML = '<div class="view">' +
      '<div class="page-head"><div><div class="eyebrow">Learning Progress</div><h1>学习进度</h1><p>所有记录保存在本机浏览器中，换设备不会自动同步。</p></div>' +
        '<div class="head-stat"><strong>' + streak + ' 天</strong>连续学习</div></div>' +
      '<div class="progress-hero">' +
        '<div class="big-ring" style="--p:' + percent * 3.6 + 'deg"><div class="big-ring-inner"><strong>' + percent + '%</strong><span>整体完成度</span></div></div>' +
        '<div class="progress-summary">' +
          '<div class="summary-mini"><span>已完成题目</span><strong>' + done + '<small>/ ' + TOTAL + '</small></strong></div>' +
          '<div class="summary-mini"><span>累计作答次数</span><strong>' + attempts + '<small>次</small></strong></div>' +
          '<div class="summary-mini"><span>累计正确率</span><strong>' + acc + '<small>%</small></strong></div>' +
          '<div class="summary-mini"><span>待巩固错题</span><strong style="color:var(--red)">' + wrongN + '<small>题</small></strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="progress-columns">' +
        '<div class="panel heatmap-card"><div class="panel-head"><h3>' + icon("fire") + '最近 28 天练习</h3><span class="small muted">共 ' + recentCount28() + ' 次作答</span></div>' +
          '<div class="heatmap">' + heatmapHtml() + '</div>' +
          '<div class="heat-legend"><span>少</span><i style="background:rgba(29,36,50,.055)"></i><i style="background:rgba(79,99,210,.22)"></i><i style="background:rgba(79,99,210,.42)"></i><i style="background:rgba(79,99,210,.65)"></i><i style="background:rgba(79,99,210,.9)"></i><span>多</span></div>' +
        '</div>' +
        '<div class="panel"><div class="panel-head"><h3>' + icon("grid") + '各科目进度</h3><span class="small muted">完成 / 总数</span></div>' +
          '<div class="subject-progress-list">' + SUBJECTS.map(s => {
            const d = subjectDone(s), p = pct(d, s.questions.length);
            return '<div class="sp-item"><div class="sp-title"><span class="sp-color" style="background:' + s.color + '"></span>' + esc(s.name) + '</div><span class="sp-num">' + d + ' / ' + s.questions.length + ' · ' + p + '%</span><div class="subject-bar"><i style="width:' + p + '%;background:' + s.color + '"></i></div></div>';
          }).join("") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="section-head"><div><h2>题型 / 章节正确率</h2><p>按最近一次作答结果统计，优先复习正确率低的题型或章节。</p></div></div>' +
      '<div class="progress-columns">' +
        '<div class="panel"><div class="panel-head"><h3>' + icon("target") + '章节表现</h3></div>' +
          (stats.length ? '<div class="chapter-acc">' + stats.map(x => {
            const cls = x.acc < 60 ? "low" : x.acc < 80 ? "mid" : "";
            return '<div class="acc-row"><span class="acc-name">' + esc(x.subject) + ' · ' + esc(x.chapter) + '</span><span class="acc-val" style="color:' + (x.acc < 60 ? "var(--red)" : x.acc < 80 ? "var(--amber)" : "var(--green)") + '">' + x.acc + '%</span><div class="acc-bar"><i class="' + cls + '" style="width:' + x.acc + '%"></i></div></div>';
          }).join("") + '</div>' : '<div class="empty-state"><strong>还没有章节数据</strong>完成练习后自动统计。</div>') +
        '</div>' +
        '<div class="panel"><div class="panel-head"><h3>' + icon("clock") + '最近作答</h3></div>' +
          (recent.length ? '<table class="activity-table"><tbody>' + recent.map(h => {
            const q = QMAP[h.qid];
            return '<tr><td><span class="status-dot ' + (h.result === "correct" ? "correct" : "wrong") + '" style="display:inline-block;margin-right:8px"></span>' + renderMD(previewStem(q.stem, 24), true) + '</td><td>' + (h.result === "correct" ? "答对" : "答错") + '</td><td>' + timeAgo(h.at) + '</td></tr>';
          }).join("") + '</tbody></table>' : '<div class="empty-state"><strong>还没有作答记录</strong>去题库做几道题吧。</div>') +
        '</div>' +
      '</div>' +
      '<div class="danger-zone"><div><strong>清空学习数据</strong><span>会删除全部做题进度、错题本和练习记录，且无法恢复。</span></div><button class="btn btn-danger btn-sm" data-action="reset-data">' + icon("trash") + '清空数据</button></div>' +
    '</div>';

    const reset = app.querySelector('[data-action="reset-data"]');
    if (reset) reset.addEventListener("click", () => {
      if (window.confirm("确定要清空全部学习进度和错题本吗？此操作无法恢复。")) {
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        practice = null;
        toast("学习数据已清空");
        renderProgress();
        updateChrome();
      }
    });
    typeset(app);
    updateChrome();
  }

  function calcStreak() {
    const days = new Set(state.history.map(h => dateKey(h.at)));
    if (!days.size) return 0;
    let cursor = new Date();
    if (!days.has(dateKey(cursor.getTime()))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(dateKey(cursor.getTime()))) return 0;
    }
    let n = 0;
    while (days.has(dateKey(cursor.getTime()))) {
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }
  function recentCount28() {
    const since = Date.now() - 28 * 86400000;
    return state.history.filter(h => h.at >= since).length;
  }
  function heatmapHtml() {
    const counts = {};
    state.history.forEach(h => { const k = dateKey(h.at); counts[k] = (counts[k] || 0) + 1; });
    let html = "";
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d.getTime());
      const c = counts[k] || 0;
      const level = c >= 8 ? 4 : c >= 5 ? 3 : c >= 2 ? 2 : c >= 1 ? 1 : 0;
      html += '<div class="heat-cell" data-level="' + level + '" title="' + k + " · " + c + ' 次"></div>';
    }
    return html;
  }

  /* ---------- 路由 ---------- */
  /* 各页面最后滚动位置，便于从练习/小结返回时恢复到进入前的位置 */
  const scrollMemory = {};
  let currentPath = "#/home";

  function route() {
    const hash = location.hash || "#/home";
    const path = hash.split("?")[0];
    if (currentPath && currentPath !== path) scrollMemory[currentPath] = window.scrollY;
    if (path === "#/practice" && !practice) {
      const cached = loadMockCache();
      if (cached) { resumeMock(cached); currentPath = path; return; }
    }
    if (path !== "#/practice") { pauseMock(); stopMockTimer(); }
    if (path === "#/practice") { renderPractice(); currentPath = path; return; }
    if (path === "#/summary") { renderSummary(); currentPath = path; return; }
    if (path === "#/bank") { renderBank(); currentPath = path; }
    else if (path === "#/papers") { renderPapers(); currentPath = path; }
    else if (path === "#/mock") { renderMock(); currentPath = path; }
    else if (path === "#/wrong") { renderWrong(); currentPath = path; }
    else if (path === "#/progress") { renderProgress(); currentPath = path; }
    else { renderHome(); currentPath = path; }
    /* 列表类页面恢复到上次离开时的滚动位置；练习/小结页自带滚动处理，不恢复。
       临时关掉 CSS 的 scroll-behavior:smooth，滚完即恢复——返回时直接定位到记录的精确值，
       不做任何平滑滚动动画（部分旧内核不认 "instant" 关键字，故用临时改 style 的方式保证生效） */
    if (path !== "#/practice" && path !== "#/summary") {
      const y = scrollMemory[path] || 0;
      const root = document.documentElement;
      const prevSB = root.style.scrollBehavior;
      if (prevSB !== "auto") root.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      if (prevSB !== "auto") root.style.scrollBehavior = prevSB;
    }
  }

  /* ---------- 事件 ---------- */
  window.addEventListener("hashchange", route);

  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("mainNav").classList.toggle("open");
  });

  app.addEventListener("click", e => {
    const zoomImg = e.target.closest("img[data-zoomable]");
    if (zoomImg) {
      e.preventDefault();
      showImageZoom(zoomImg.getAttribute("src"), zoomImg.getAttribute("alt") || "题目配图");
      return;
    }
    const jump = e.target.closest("[data-subject-jump]");
    if (jump) {
      e.preventDefault();
      bankFilter.subject = jump.getAttribute("data-subject-jump");
      bankFilter.category = "all"; bankFilter.chapter = "all"; bankFilter.page = 1;
      location.hash = "#/bank";
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) {
      e.stopPropagation();
      const id = open.getAttribute("data-open");
      const q = QMAP[id];
      const list = filteredQuestions();
      const ids = list.map(x => x.id);
      if (!ids.includes(id)) ids.unshift(id);
      startPractice(ids, q.category + " · " + SMAP[q.subjectId].name, "practice", ids.indexOf(id));
    }
  }, true);

  document.addEventListener("keydown", e => {
    if (!practice || location.hash !== "#/practice") return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    const q = currentQ();
    if (!q) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); gotoGroup(practice.groupIndex - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); gotoGroup(practice.groupIndex + 1); }
    if (e.key === "Enter" && !isExam() && !practice.submitted[q.id]) { e.preventDefault(); submitCurrent(); }
    if (/^[a-dA-D]$/.test(e.key) && !practice.submitted[q.id] && (q.type === "single" || q.type === "multiple" || q.type === "judgment")) {
      const key = e.key.toUpperCase();
      if ((q.options || []).some(o => o.key === key)) {
        e.preventDefault();
        updateSelectionByKey(q, key);
      }
    }
  });

  function updateSelectionByKey(q, key) {
    if (q.type === "multiple") {
      let arr = Array.isArray(practice.selections[q.id]) ? practice.selections[q.id].slice() : [];
      if (arr.includes(key)) arr = arr.filter(k => k !== key); else arr.push(key);
      practice.selections[q.id] = arr.sort();
    } else {
      practice.selections[q.id] = key;
    }
    updateOptionUI(q);
    persistMockProgress();
    if (isExam()) refreshExamChrome();
  }

  /* ---------- 启动 ---------- */
  window.addEventListener("pagehide", pauseMock);
  window.addEventListener("beforeunload", pauseMock);
  updateChrome();
  route();
})();
