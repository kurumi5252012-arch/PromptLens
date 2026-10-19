import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Beaker,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  FlaskConical,
  History,
  Layers3,
  LoaderCircle,
  Plus,
  Play,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import {
  type Case,
  type Result,
  type Run,
  type Summary,
  defaults,
  sampleCases,
  api,
  exportRun,
} from "./workspace";

function Status({ result }: { result: Result }) {
  if (result.error)
    return (
      <span className="status fail">
        <X size={12} />
        请求失败
      </span>
    );
  if (!result.checks.length)
    return <span className="status neutral">未设规则</span>;
  const passed = result.checks.every((c) => c.passed);
  return (
    <span className={`status ${passed ? "pass" : "fail"}`}>
      {passed ? <Check size={12} /> : <X size={12} />}
      {passed ? "通过" : "未通过"}{" "}
      {result.checks.filter((c) => c.passed).length}/{result.checks.length}
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState<"workbench" | "history" | "guide">(
    "workbench",
  );
  const [name, setName] = useState("用户反馈 · 情绪分析");
  const [prompts, setPrompts] = useState(defaults);
  const [cases, setCases] = useState<Case[]>(sampleCases);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [config, setConfig] = useState<{
    liveAvailable: boolean;
    model: string | null;
  } | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"cases" | "results">("cases");
  const [elapsed, setElapsed] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    api<typeof config>("/api/config")
      .then(setConfig)
      .catch(() =>
        setError("无法连接本地服务，请确认 npm run dev 或 npm start 已启动。"),
      );
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [selected]);
  const updateCase = (index: number, patch: Partial<Case>) =>
    setCases(cases.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  async function loadHistory() {
    setLoadingHistory(true);
    setError("");
    try {
      setHistory(await api<Summary[]>("/api/runs"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingHistory(false);
    }
  }
  function navigate(next: typeof page) {
    setPage(next);
    setError("");
    if (next === "history") void loadHistory();
  }
  async function execute() {
    setRunning(true);
    setError("");
    setElapsed(0);
    try {
      const result = await api<Run>("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prompts, cases, mode }),
      });
      setRun(result);
      setTab("results");
      setTimeout(() => resultHeading.current?.focus(), 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }
  async function openRun(id: string) {
    setError("");
    try {
      const saved = await api<Run>(`/api/runs/${id}`);
      setRun(saved);
      setName(saved.name);
      setPrompts(saved.prompts);
      setCases(saved.cases);
      setMode(saved.mode);
      setPage("workbench");
      setTab("results");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const checkCount = cases.reduce(
    (n, c) => n + Number(c.json) + Number(Boolean(c.keyword.trim())),
    0,
  );
  const completeResults = run?.results.filter((r) => !r.error) || [];
  const ruleResults =
    run?.results.filter((r) => !r.error && r.checks.length > 0) || [];
  const passCount = ruleResults.filter((r) =>
    r.checks.every((c) => c.passed),
  ).length;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("workbench");
          }}
        >
          <span className="brand-icon">
            <Code2 size={23} />
          </span>
          <span>
            PromptLens<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="主导航">
          <button
            className={page === "workbench" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("workbench")}
          >
            <FlaskConical size={18} />
            实验工作台<span className="nav-short">01</span>
          </button>
          <button
            className={page === "history" ? "nav-item active" : "nav-item"}
            disabled={running}
            onClick={() => navigate("history")}
          >
            <History size={18} />
            运行记录
          </button>
          <button
            className={page === "guide" ? "nav-item active" : "nav-item"}
            disabled={running}
            onClick={() => navigate("guide")}
          >
            <BookOpen size={18} />
            使用指南
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="mini-icon">
            <Sparkles size={18} />
          </span>
          <strong>让每一次修改有据可依</strong>
          <p>从“感觉更好”到可复现的测试。用同一组输入，找到更稳的提示词。</p>
          <button onClick={() => navigate("guide")}>
            了解评测方式 <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="local-dot" />
          本地工作空间<span className="version">v0.1.0</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            工作空间 <ChevronRight size={13} />
            <span>
              {page === "workbench"
                ? "实验工作台"
                : page === "history"
                  ? "运行记录"
                  : "使用指南"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="local-tag">
              <span className="local-dot" /> Local-first
            </span>
            <button
              className="icon-button"
              aria-label="使用指南"
              onClick={() => navigate("guide")}
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              <X size={17} />
              <span>{error}</span>
              <button aria-label="关闭错误提示" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {page === "workbench" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">THE PROMPT PLAYGROUND</div>
                  <h1>
                    好提示词，经得起对比<span>。</span>
                  </h1>
                  <p>并排测试，逐条验证。让提示词的每次迭代都看得见。</p>
                </div>
                <span className="outline-tag">
                  <Beaker size={14} /> Experiment 001
                </span>
              </div>
              <div className="experiment-bar">
                <div className="experiment-name">
                  <span className="square-icon">
                    <Layers3 size={18} />
                  </span>
                  <div>
                    <label htmlFor="experiment-name">实验名称</label>
                    <input
                      id="experiment-name"
                      maxLength={100}
                      value={name}
                      disabled={running}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="experiment-actions">
                  <div className="segmented" aria-label="运行模式">
                    <button
                      disabled={running}
                      aria-pressed={mode === "demo"}
                      className={mode === "demo" ? "chosen" : ""}
                      onClick={() => setMode("demo")}
                    >
                      离线演示
                    </button>
                    <button
                      disabled={running || !config?.liveAvailable}
                      title={
                        config?.liveAvailable
                          ? config.model || ""
                          : "先按使用指南配置服务端 .env"
                      }
                      aria-pressed={mode === "live"}
                      className={mode === "live" ? "chosen" : ""}
                      onClick={() => setMode("live")}
                    >
                      真实模型
                    </button>
                  </div>
                  <button
                    className="primary-button"
                    disabled={
                      running ||
                      !config ||
                      !name.trim() ||
                      prompts.some((p) => !p.trim()) ||
                      cases.some((c) => !c.input.trim())
                    }
                    onClick={() => void execute()}
                  >
                    {running ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Play size={15} fill="currentColor" />
                    )}
                    {running ? `运行中 · ${elapsed}s` : "运行对比"}
                    {!running && (
                      <span className="button-count">{cases.length * 2}</span>
                    )}
                  </button>
                </div>
              </div>
              <div className="mode-notice">
                <span className="notice-dot" />
                <span>
                  {mode === "demo"
                    ? "演示模式使用固定示例回答，不执行提示词；耗时包含模拟等待，Token 不计量。"
                    : `真实模型：${config?.model}。运行将向配置的服务发送提示词与用例，并可能产生费用。`}
                </span>
                <span className="notice-end">
                  {mode === "demo" ? "无需 API Key" : "密钥仅在服务端"}
                </span>
              </div>
              <section className="prompt-grid" aria-label="提示词对比编辑器">
                {prompts.map((prompt, i) => (
                  <article className={`prompt-card variant-${i}`} key={i}>
                    <div className="card-top">
                      <div className="card-title">
                        <span className={`variant-badge ${i ? "purple" : ""}`}>
                          {i ? "B" : "A"}
                        </span>
                        <strong>{i ? "改进版本" : "基准版本"}</strong>
                        <span className="small-tag">
                          {i ? "Challenger" : "Baseline"}
                        </span>
                      </div>
                      <Code2 size={16} className="muted" />
                    </div>
                    <label className="sr-only" htmlFor={`prompt-${i}`}>
                      提示词 {i ? "B" : "A"}
                    </label>
                    <textarea
                      id={`prompt-${i}`}
                      spellCheck={false}
                      disabled={running}
                      maxLength={12000}
                      value={prompt}
                      onChange={(e) =>
                        setPrompts(
                          prompts.map((p, j) => (j === i ? e.target.value : p)),
                        )
                      }
                    />
                    <div className="editor-footer">
                      <span>
                        <span className="variable">{"{{input}}"}</span>{" "}
                        自动填入测试用例；无占位符时追加在末尾
                      </span>
                      <span>{prompt.length} 字符</span>
                    </div>
                  </article>
                ))}
              </section>
              <section className="test-section">
                <div className="section-tabs">
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="测试与结果"
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "cases"
                          : event.key === "End"
                            ? "results"
                            : tab === "cases"
                              ? "results"
                              : "cases";
                      setTab(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }}
                  >
                    <button
                      id="tab-cases"
                      role="tab"
                      tabIndex={tab === "cases" ? 0 : -1}
                      aria-controls="panel-cases"
                      aria-selected={tab === "cases"}
                      className={tab === "cases" ? "tab active-tab" : "tab"}
                      onClick={() => setTab("cases")}
                    >
                      <Layers3 size={16} />
                      测试用例<span>{cases.length}</span>
                    </button>
                    <button
                      id="tab-results"
                      role="tab"
                      tabIndex={tab === "results" ? 0 : -1}
                      aria-controls="panel-results"
                      aria-selected={tab === "results"}
                      className={tab === "results" ? "tab active-tab" : "tab"}
                      onClick={() => setTab("results")}
                    >
                      <CheckCheck size={17} />
                      对比结果{run && <span>{run.results.length}</span>}
                    </button>
                  </div>
                  <span className="section-meta">
                    {tab === "cases"
                      ? `${checkCount} 条检查规则 · 最多 12 条用例`
                      : run
                        ? new Date(run.createdAt).toLocaleString("zh-CN")
                        : "等待首次运行"}
                  </span>
                </div>
                {tab === "cases" ? (
                  <div
                    className="cases-panel"
                    id="panel-cases"
                    role="tabpanel"
                    aria-labelledby="tab-cases"
                  >
                    <div className="panel-intro">
                      <div>
                        <h2>给提示词出几道考题</h2>
                        <p>
                          同一组输入，两版提示词。检查规则对 A / B 同时生效。
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        disabled={running || cases.length >= 12}
                        onClick={() =>
                          setCases([
                            ...cases,
                            { input: "", keyword: "", json: false },
                          ])
                        }
                      >
                        <Plus size={15} />
                        添加用例
                      </button>
                    </div>
                    <div className="case-table-head">
                      <span>测试输入</span>
                      <span>检查规则</span>
                      <span />
                    </div>
                    {cases.map((c, i) => (
                      <div className="case-row" key={i}>
                        <div className="case-input">
                          <span className="case-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <label className="sr-only" htmlFor={`input-${i}`}>
                            用例 {i + 1} 输入
                          </label>
                          <textarea
                            id={`input-${i}`}
                            rows={2}
                            maxLength={4000}
                            disabled={running}
                            value={c.input}
                            placeholder="输入一条真实场景中的问题或反馈…"
                            onChange={(e) =>
                              updateCase(i, { input: e.target.value })
                            }
                          />
                        </div>
                        <div className="case-rules">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              disabled={running}
                              checked={c.json}
                              onChange={(e) =>
                                updateCase(i, { json: e.target.checked })
                              }
                            />
                            有效 JSON
                          </label>
                          <label className="keyword-label">
                            <span>包含</span>
                            <input
                              aria-label={`用例 ${i + 1} 必含关键词`}
                              maxLength={200}
                              disabled={running}
                              value={c.keyword}
                              placeholder="可选关键词"
                              onChange={(e) =>
                                updateCase(i, { keyword: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <button
                          className="icon-button delete-button"
                          aria-label={`删除用例 ${i + 1}`}
                          disabled={running || cases.length === 1}
                          onClick={() =>
                            setCases(cases.filter((_, j) => i !== j))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    <div className="panel-footer">
                      <CircleHelp size={14} />
                      规则检查用于验证输出格式或关键词，不代表事实准确性或整体回答质量。
                    </div>
                  </div>
                ) : (
                  <div
                    className="results-panel"
                    id="panel-results"
                    role="tabpanel"
                    aria-labelledby="tab-results"
                  >
                    {!run ? (
                      <div className="empty-state">
                        <span className="empty-icon">
                          <FlaskConical size={26} />
                        </span>
                        <h2>第一次对比，从这里开始</h2>
                        <p>
                          使用预置用例点击“运行对比”，查看两版提示词的检查结果。
                        </p>
                        <button
                          className="secondary-button"
                          disabled={running || !config}
                          onClick={() => void execute()}
                        >
                          <Play size={14} />
                          运行当前实验
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="panel-intro">
                          <div>
                            <h2 ref={resultHeading} tabIndex={-1}>
                              {run.name}{" "}
                              <span className="small-tag">
                                {run.mode === "demo" ? "离线示例" : run.model}
                              </span>
                            </h2>
                            <p>
                              本次快照 · {run.cases.length} 条用例 ·
                              点击回答查看全文和检查详情
                            </p>
                          </div>
                          <div className="export-actions">
                            <button
                              className="secondary-button"
                              onClick={() => exportRun(run, "json")}
                            >
                              <ArrowDownToLine size={14} />
                              JSON
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => exportRun(run, "md")}
                            >
                              <ArrowDownToLine size={14} />
                              Markdown
                            </button>
                          </div>
                        </div>
                        <div className="result-stats">
                          <div>
                            <span>有规则且通过的回答</span>
                            <strong>
                              {passCount}
                              <small> / {ruleResults.length}</small>
                            </strong>
                          </div>
                          <div>
                            <span>成功返回</span>
                            <strong>
                              {completeResults.length}
                              <small> / {run.results.length}</small>
                            </strong>
                          </div>
                          <div>
                            <span>
                              {run.mode === "demo"
                                ? "演示耗时 · 含模拟等待"
                                : "平均响应耗时"}
                            </span>
                            <strong>
                              {completeResults.length
                                ? Math.round(
                                    completeResults.reduce(
                                      (n, r) => n + r.latencyMs,
                                      0,
                                    ) / completeResults.length,
                                  )
                                : "—"}
                              <small> ms</small>
                            </strong>
                          </div>
                        </div>
                        <div className="results-table">
                          <div className="result-header">
                            <span>测试用例</span>
                            <span>
                              <b className="variant-badge">A</b> 基准版本
                            </span>
                            <span>
                              <b className="variant-badge purple">B</b> 改进版本
                            </span>
                          </div>
                          {run.cases.map((c, i) => (
                            <div className="result-row" key={i}>
                              <div className="result-input">
                                <span className="case-number">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <p>{c.input}</p>
                              </div>
                              {[0, 1].map((variant) => {
                                const r = run.results.find(
                                  (r) =>
                                    r.caseIndex === i && r.variant === variant,
                                )!;
                                return (
                                  <button
                                    className="result-cell"
                                    key={variant}
                                    onClick={() => setSelected(r)}
                                    aria-label={`查看用例 ${i + 1} 版本 ${variant ? "B" : "A"} 回答`}
                                  >
                                    <Status result={r} />
                                    <pre>{r.error || r.output}</pre>
                                    <span className="result-cell-footer">
                                      <span>
                                        <Clock3 size={12} />
                                        {r.latencyMs}ms
                                      </span>
                                      <span>
                                        {r.tokens === null
                                          ? "Token —"
                                          : `${r.tokens} tokens`}
                                      </span>
                                      <ArrowRight size={13} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        <div className="panel-footer">
                          <CircleHelp size={14} />
                          {run.mode === "demo"
                            ? "固定回答仅展示操作流程；修改提示词不会改变演示逻辑。请接入真实模型验证效果。"
                            : "规则通过不代表回答正确。请结合原始回答和业务需求进行人工复核。"}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
              <footer className="workspace-footer">
                <span>
                  <Zap size={13} />
                  小步迭代，明确验证。
                </span>
                <span>Built for thoughtful experiments.</span>
              </footer>
            </>
          )}
          {page === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EXPERIMENT LOG</div>
                  <h1>
                    每次实验，都有迹可循<span>。</span>
                  </h1>
                  <p>
                    本地保存最近 50 次已完成实验，包括提示词、用例和原始回答。
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void loadHistory()}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <History size={15} />
                  )}
                  刷新
                </button>
              </div>
              <div className="history-panel">
                {loadingHistory ? (
                  <div className="empty-state">正在读取本地记录…</div>
                ) : !history.length ? (
                  <div className="empty-state">
                    <History size={30} />
                    <h2>还没有运行记录</h2>
                    <p>完成一次对比后，实验会自动保存在这里。</p>
                    <button
                      className="secondary-button"
                      onClick={() => navigate("workbench")}
                    >
                      前往工作台
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  history.map((h) => (
                    <button
                      className="history-row"
                      key={h.id}
                      onClick={() => void openRun(h.id)}
                    >
                      <span className="square-icon">
                        <FlaskConical size={19} />
                      </span>
                      <div>
                        <strong>{h.name}</strong>
                        <p>
                          {new Date(h.createdAt).toLocaleString("zh-CN")} ·{" "}
                          {h.caseCount} 条用例
                        </p>
                      </div>
                      <span className="small-tag">
                        {h.mode === "demo" ? "离线演示" : "真实模型"}
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
          {page === "guide" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A SMALL FIELD GUIDE</div>
                  <h1>
                    先定义好，再比较<span>。</span>
                  </h1>
                  <p>一次有意义的实验，从明确你想验证什么开始。</p>
                </div>
              </div>
              <div className="guide-grid">
                <article className="guide-card">
                  <span className="guide-index">01 / WORKFLOW</span>
                  <h2>三步完成第一次实验</h2>
                  <ol>
                    <li>
                      编辑 A / B 两版提示词，用 {"{{input}}"} 标记输入位置。
                    </li>
                    <li>
                      添加相同的测试用例，按需勾选 JSON 或设置必含关键词。
                    </li>
                    <li>
                      运行对比，逐条阅读回答，再导出 JSON 或 Markdown 报告。
                    </li>
                  </ol>
                  <p>
                    离线演示使用固定模板，便于了解流程；真实推理需要配置模型。
                  </p>
                </article>
                <article className="guide-card">
                  <span className="guide-index">02 / MODEL CONNECTION</span>
                  <h2>
                    <Settings2 size={20} />
                    接入真实模型
                  </h2>
                  <p>
                    将项目根目录 .env.example 复制为 .env，填写兼容 Chat
                    Completions 的服务：
                  </p>
                  <pre>
                    MODEL_BASE_URL=https://your-provider/v1{"\n"}
                    MODEL_API_KEY=your-key{"\n"}MODEL_NAME=your-model
                  </pre>
                  <p>
                    重启服务后即可选择“真实模型”。密钥仅在服务端读取，不返回浏览器。支持返回文本的兼容接口，暂不支持专用推理参数或流式输出。
                  </p>
                </article>
                <article className="guide-card">
                  <span className="guide-index">03 / READING RESULTS</span>
                  <h2>理解数字的边界</h2>
                  <p>
                    JSON 检查直接解析完整回答；带代码围栏的 JSON
                    会判定失败。关键词检查不区分大小写，使用连续子串匹配。
                  </p>
                  <p>
                    Token 取自服务商
                    usage.total_tokens；未提供时显示“—”。耗时为服务端请求墙钟时间。规则通过率不等于模型准确率。
                  </p>
                </article>
                <article className="guide-card">
                  <span className="guide-index">04 / LOCAL BY DEFAULT</span>
                  <h2>数据留在哪里？</h2>
                  <p>
                    实验保存在本机 data/promptlens.sqlite，最多保留 50
                    次。真实运行会把提示词和输入发送到你配置的模型服务。
                  </p>
                  <p>
                    这是个人本地工具，没有登录或多用户隔离；默认仅监听
                    127.0.0.1。运行中的任务在服务重启后不会恢复。导出前请检查业务敏感内容。
                  </p>
                </article>
              </div>
              <button
                className="secondary-button guide-back"
                onClick={() => navigate("workbench")}
              >
                <ArrowLeft size={15} />
                回到实验工作台
              </button>
            </>
          )}
          <div className="sr-only" aria-live="polite">
            {running
              ? `实验运行中，已用 ${elapsed} 秒`
              : run
                ? "实验结果已就绪"
                : ""}
          </div>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="response-dialog"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
        aria-labelledby="response-title"
      >
        {selected && run && (
          <>
            <div className="dialog-header">
              <div>
                <span className="eyebrow">RESPONSE INSPECTOR</span>
                <h2 id="response-title">
                  用例 {selected.caseIndex + 1} · 版本{" "}
                  {selected.variant ? "B" : "A"}
                </h2>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="关闭回答详情"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="dialog-content">
              <h3>测试输入</h3>
              <p>{run.cases[selected.caseIndex].input}</p>
              <h3>完整回答</h3>
              <pre className="full-response">
                {selected.error || selected.output}
              </pre>
              <h3>检查详情</h3>
              {selected.error ? (
                <p className="error-text">{selected.error}</p>
              ) : selected.checks.length ? (
                selected.checks.map((c, i) => (
                  <div
                    className={`check-detail ${c.passed ? "passed" : "failed"}`}
                    key={i}
                  >
                    {c.passed ? <Check size={16} /> : <X size={16} />}
                    {c.name}
                    <span>{c.passed ? "通过" : "未通过"}</span>
                  </div>
                ))
              ) : (
                <p>本用例未设置规则。</p>
              )}
              <div className="dialog-meta">
                {selected.latencyMs} ms · {selected.tokens ?? "未提供"} tokens ·{" "}
                {run.mode === "demo" ? "固定离线示例" : run.model}
              </div>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
