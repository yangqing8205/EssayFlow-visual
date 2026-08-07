"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DEMO } from "@/data/examples/demo";
import { parseEssay, parsePromptText, wordCount } from "@/lib/workflow/parser";
import type { EssayInput, FinalReport, ParsedEssay, ProviderStatus, WorkflowState } from "@/lib/schemas";
import { Report } from "@/components/Report";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

type View = "input" | "confirm" | "progress" | "report";
const EMPTY: EssayInput = { promptText: "", studentParagraph1: "", studentParagraph2: "" };
const STORAGE_KEY = "essayflow-draft-v2";
const stages: { key: WorkflowState["stage"]; label: string }[] = [
  { key: "parse", label: "识别原文与两句段首语" },
  { key: "story", label: "提取核心矛盾与主题终点" },
  { key: "language", label: "通读全文语言表现" },
  { key: "score", label: "内容判档与语言档内定分" },
  { key: "report", label: "生成个性化报告" },
];

function readDraft(): EssayInput {
  if (typeof window === "undefined") return EMPTY;
  const draft = window.localStorage.getItem(STORAGE_KEY);
  if (!draft) return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(draft) as Partial<EssayInput>) };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return EMPTY;
  }
}

async function fetchDemoReport(): Promise<FinalReport> {
  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "demo" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "示例报告加载失败");
  return data as FinalReport;
}

export function EvaluateWorkbench() {
  const searchParams = useSearchParams();
  const wantsDemo = searchParams.get("demo") === "1";
  const [view, setView] = useState<View>("input");
  const [form, setForm] = useState<EssayInput>(() => readDraft());
  const [parsed, setParsed] = useState<ParsedEssay | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [provider, setProvider] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/provider-status")
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (alive && data) setProvider(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!Object.values(form).some(Boolean)) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    }, 500);
    return () => clearTimeout(timer);
  }, [form]);

  // ?demo=1 才请求脱敏示例报告；真实评测永远不走这条路径。
  useEffect(() => {
    if (!wantsDemo) return;
    let alive = true;
    fetchDemoReport()
      .then(data => {
        if (!alive) return;
        setError("");
        setErrorCode("");
        setReport(data);
        setView("report");
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "示例报告加载失败");
      });
    return () => {
      alive = false;
    };
  }, [wantsDemo]);

  const update = (key: keyof EssayInput, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const fillDemoInput = () => {
    setForm(DEMO);
    setView("input");
    setError("");
    setErrorCode("");
  };
  const clear = () => {
    setForm(EMPTY);
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt("");
  };

  function handleParse() {
    try {
      setParsed(parseEssay(form));
      setError("");
      setErrorCode("");
      setView("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "输入格式有误");
    }
  }

  async function evaluate() {
    if (!parsed) return;
    setView("progress");
    setDone(["parse"]);
    setError("");
    setErrorCode("");
    setActive("story");
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed, mode: "real" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorCode(typeof data.code === "string" ? data.code : "");
        throw new Error(data.error || "评测未完成");
      }
      setDone(stages.map(stage => stage.key));
      setActive("");
      setReport(data);
      setView("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "评测未完成");
      setActive("");
      setView("confirm");
    }
  }

  const step = view === "input" ? 1 : view === "confirm" || view === "progress" ? 2 : 3;
  return (
    <main className="app-shell">
      <SiteHeader variant="app" step={step} />
      {view === "input" && (
        <InputWorkspace
          form={form}
          update={update}
          demo={fillDemoInput}
          clear={clear}
          error={error}
          errorCode={errorCode}
          next={handleParse}
          savedAt={savedAt}
          provider={provider}
        />
      )}
      {view === "confirm" && parsed && (
        <Confirm
          parsed={parsed}
          setParsed={setParsed}
          back={() => setView("input")}
          next={evaluate}
          error={error}
          errorCode={errorCode}
          provider={provider}
        />
      )}
      {view === "progress" && <Progress active={active} done={done} />}
      {view === "report" && report && (
        <div className="page-width report-page">
          <Report report={report} onRevise={() => setView("input")} />
        </div>
      )}
      <SiteFooter />
    </main>
  );
}

function InputWorkspace({ form, update, demo, clear, error, errorCode, next, savedAt, provider }: { form: EssayInput; update: (key: keyof EssayInput, value: string) => void; demo: () => void; clear: () => void; error: string; errorCode: string; next: () => void; savedAt: string; provider: ProviderStatus | null }) {
  const extracted = useMemo(() => {
    try {
      return parsePromptText(form.promptText);
    } catch {
      return { sourceText: "", starter1: "", starter2: "" };
    }
  }, [form.promptText]);
  const checks = [
    { label: "阅读原文", ok: extracted.sourceText.length >= 60 },
    { label: "两句段首语", ok: Boolean(extracted.starter1 && extracted.starter2) },
    { label: "第一段续写", ok: form.studentParagraph1.trim().length >= 10 },
    { label: "第二段续写", ok: form.studentParagraph2.trim().length >= 10 },
  ];
  const ready = checks.every(check => check.ok);
  return <div className="workspace page-width">
    <div className="workspace-title"><div><p className="eyebrow">步骤 1 / 3</p><h1>提交续写内容</h1><p>完整题目只需粘贴一次，我们会自动识别并锁定两句段首语。</p></div><button className="text-button" onClick={demo}>填入示例题目</button></div>
    <div className="workspace-grid"><div className="editor-column">
      <EditorCard index="01" title="粘贴完整题目" hint="包含阅读原文、注意事项和两句段首语" count={wordCount(form.promptText)}><textarea rows={13} value={form.promptText} onChange={e => update("promptText", e.target.value)} placeholder="将整道读后续写题目粘贴到这里……"/></EditorCard>
      <section className="parse-panel"><div className="parse-heading"><span className={extracted.starter2 ? "parse-icon ok" : "parse-icon"}>{extracted.starter2 ? "✓" : "↗"}</span><div><b>自动识别结果</b><p>段首语会锁定，不参与语言纠错，也不计入学生原创词数</p></div></div><LockedRow label="P1 段首语" value={extracted.starter1}/><LockedRow label="P2 段首语" value={extracted.starter2}/></section>
      <div className="paragraph-grid"><EditorCard index="02" title="第一段学生续写" hint="无需重复第一段给定首句" count={wordCount(form.studentParagraph1)}><textarea rows={8} value={form.studentParagraph1} onChange={e => update("studentParagraph1", e.target.value)} placeholder="粘贴第一段学生原创内容……"/></EditorCard><EditorCard index="03" title="第二段学生续写" hint="无需重复第二段给定首句" count={wordCount(form.studentParagraph2)}><textarea rows={8} value={form.studentParagraph2} onChange={e => update("studentParagraph2", e.target.value)} placeholder="粘贴第二段学生原创内容……"/></EditorCard></div>
      {error && <ErrorBanner error={error} code={errorCode} />}
    </div>
    <aside className="check-panel">{provider && !provider.configured && <ProviderNotice />}<div className="readiness"><span>{checks.filter(check => check.ok).length}</span><small>/4 项就绪</small></div><h3>提交前检查</h3>{checks.map(check => <div className={`check-row ${check.ok ? "ok" : ""}`} key={check.label}><span>{check.ok ? "✓" : "·"}</span>{check.label}</div>)}<div className="word-summary"><span>学生原创词数</span><b>{wordCount(form.studentParagraph1) + wordCount(form.studentParagraph2)}</b><small>不含给定首句 · 建议约 150 词</small></div><div className="privacy-note"><b>隐私提示</b><p>请删除姓名、学校、班级等个人信息。</p></div></aside></div>
    <div className="sticky-actions"><div><span className="save-dot">●</span>{savedAt ? `${savedAt} 已保存草稿` : "输入后自动保存草稿"}<button onClick={clear}>清空</button></div><button disabled={!ready} className="btn btn-primary" onClick={next}>解析并确认 <span>→</span></button></div>
  </div>;
}

function EditorCard({ index, title, hint, count, children }: { index: string; title: string; hint: string; count: number; children: React.ReactNode }) {
  return <label className="editor-card"><div className="editor-head"><span>{index}</span><div><b>{title}</b><p>{hint}</p></div><small>{count} words</small></div>{children}</label>;
}

function LockedRow({ label, value }: { label: string; value: string }) {
  return <div className={`locked-row ${value ? "found" : ""}`}><span>{label}</span><p>{value || "等待识别……"}</p><i>{value ? "已锁定" : "未识别"}</i></div>;
}

function Confirm({ parsed, setParsed, back, next, error, errorCode, provider }: { parsed: ParsedEssay; setParsed: (parsed: ParsedEssay) => void; back: () => void; next: () => void; error: string; errorCode: string; provider: ProviderStatus | null }) {
  const fields: [keyof ParsedEssay, string, boolean][] = [["sourceText", "阅读原文", false], ["starter1", "第一段固定首句", true], ["studentParagraph1", "第一段学生原创", false], ["starter2", "第二段固定首句", true], ["studentParagraph2", "第二段学生原创", false]];
  const blocked = Boolean(provider && !provider.configured);
  return <div className="confirm-page page-width"><p className="eyebrow">步骤 2 / 3</p><h1>确认内容边界</h1><p>这是评分准确性的关键一步。请确认两句段首语没有被算入学生原创。</p>
    <div className="confirm-grid">{fields.map(([key, label, locked], index) => <label className={`editor-card ${index === 0 ? "wide" : ""}`} key={key}><div className="editor-head"><div><b>{label}</b></div>{locked && <i className="lock-badge">锁定内容</i>}</div><textarea rows={index === 0 ? 7 : 5} value={parsed[key]} onChange={e => setParsed({ ...parsed, [key]: e.target.value })}/></label>)}</div>
    {blocked && <ProviderNotice />}{error && <ErrorBanner error={error} code={errorCode} />}
    <div className="confirm-actions"><button className="btn btn-ghost" onClick={back}>← 返回修改</button><button className="btn btn-primary" onClick={next} disabled={blocked}>确认并开始评测 →</button></div>
  </div>;
}

function ProviderNotice() {
  return <div className="provider-notice" role="status"><b>当前未配置 AI 模型</b><p>暂时无法分析你的作文。部署者需在服务端环境变量中配置 <code>OPENAI_API_KEY</code> 后重试。示例报告仍可查看，但它只是自编演示素材。</p></div>;
}

function ErrorBanner({ error, code }: { error: string; code: string }) {
  const hint = code === "PROVIDER_NOT_CONFIGURED" ? "服务端尚未配置 OPENAI_API_KEY。" : code === "MODEL_OUTPUT_INVALID" ? "模型多次返回的结构都不符合报告要求，未生成任何报告。" : code === "MODEL_CALL_FAILED" ? "模型调用失败，请检查网络、Key 或模型名后重试。" : "";
  return <div className="error-banner" role="alert"><b>本次评测未完成</b><p>{error}</p>{hint && <p className="error-hint">{hint}</p>}</div>;
}

function Progress({ active, done }: { active: string; done: string[] }) {
  return <div className="progress-page page-width"><div className="orb"/><p className="eyebrow">正在评测</p><h1>先理解故事，再判断分数</h1><p>正在调用模型分析你本次提交的内容。</p><div className="progress-list">{stages.map(stage => <div className={active === stage.key ? "active" : done.includes(stage.key) ? "done" : ""} key={stage.key}><span>{done.includes(stage.key) ? "✓" : "·"}</span>{stage.label}</div>)}</div></div>;
}
