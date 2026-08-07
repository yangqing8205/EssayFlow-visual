"use client";

import { useState } from "react";
import { REPORT_KIND_LABEL, type FinalReport } from "@/lib/schemas";

const tone: Record<string, string> = { 表现充分: "status-good", 轻微瑕疵: "status-warn", 明显问题: "status-risk", "失败/硬伤": "status-bad" };

export function Report({ report, onRevise }: { report: FinalReport; onRevise: () => void }) {
  const [tab, setTab] = useState<"brief" | "full">("brief");
  return <div className="report-shell">
    {report.reportKind === "demo" && <p className="report-kind-banner" role="note">脱敏示例报告 · 内容为自编演示素材，不是对你作文的评测</p>}
    <section className="score-hero"><div><p className="eyebrow light">{REPORT_KIND_LABEL[report.reportKind]}</p><h1>{report.score.total}<small>/25</small></h1><div className="score-chips"><span>第 {report.score.band} 档</span><span>{report.score.languagePlacement}</span><span>{report.modelVersion}</span></div></div><div className="score-summary"><h2>{report.score.level}</h2><p>{report.score.summary}</p></div></section>
    <div className="report-tabs"><button className={tab === "brief" ? "active" : ""} onClick={() => setTab("brief")}>核心速览</button><button className={tab === "full" ? "active" : ""} onClick={() => setTab("full")}>完整报告</button></div>
    {tab === "brief" ? <Brief report={report}/> : <Full report={report}/>} 
    <div className="report-actions"><button className="btn btn-ghost" onClick={() => window.print()}>打印报告</button><button className="btn btn-primary" onClick={onRevise}>修改后再次评测</button></div>
  </div>;
}

function Brief({ report }: { report: FinalReport }) { const theme = report.story.themeTrajectory; return <>
  <section className="report-grid two"><article className="report-card"><p className="eyebrow">内容决定档位</p><h3>四项内容标准 → 第 {report.score.band} 档</h3><p>{report.score.contentJudgements.filter(x => x.status === "表现充分").length} 项表现充分，其余项目仍有改进空间。</p></article><article className="report-card"><p className="eyebrow">语言决定档内分</p><h3>{report.score.languagePlacement}</h3><p>{report.score.languageRationale}</p></article></section>
  <section className="report-card theme-card"><div><p className="eyebrow">主题终点检查</p><h3>{theme.continuationAlignment}</h3><p>{theme.explanation}</p></div><div className="theme-route"><span>{theme.initial}</span><b>→</b><span>{theme.endpoint}</span></div></section>
  <section><div className="section-heading"><div><p className="eyebrow">内容判档证据</p><h2>为什么是这个档位</h2></div></div><div className="judgement-grid">{report.score.contentJudgements.map(item => <article className="report-card judgement" key={item.key}><div className="judgement-head"><h3>{item.label}</h3><span className={tone[item.status]}>{item.status}</span></div><p>{item.judgement}</p><div className="evidence"><b>文本证据</b>{item.evidence.map((x, i) => <q key={i}>{x}</q>)}</div><p className="next"><b>再提高：</b>{item.suggestion}</p></article>)}</div></section>
  </>; }

function Full({ report }: { report: FinalReport }) { const theme = report.story.themeTrajectory; return <>
  <section className="report-card"><p className="eyebrow">原文故事模型</p><h2>冲突、伏笔与回应</h2><div className="story-flow"><div><b>核心矛盾</b><p>{report.story.conflict}</p></div><div><b>学生解决路径</b><p>{report.story.resolution}</p></div><div><b>形成的主题</b><p>{report.story.theme}</p></div></div></section>
  <section className="report-card"><p className="eyebrow">主题发展轨迹</p><div className="trajectory"><div><b>起点</b><p>{theme.initial}</p></div><div><b>发展</b><p>{theme.development}</p></div><div><b>终点</b><p>{theme.endpoint}</p></div><div><b>学生对齐</b><p>{theme.continuationAlignment}：{theme.explanation}</p></div></div></section>
  <section className="report-card"><p className="eyebrow">语言整体表现</p><h2>{report.score.languagePlacement}</h2><p>{report.language.overall}</p><div className="strength-list">{report.language.strengths.map(x => <span key={x}>✓ {x}</span>)}</div></section>
  <section><div className="section-heading"><div><p className="eyebrow">逐句精修</p><h2>原句、问题与润色结果</h2></div></div><div className="sentence-list">{report.language.issues.map((item, i) => <article className="report-card sentence" key={i}><span className="sentence-no">{String(i + 1).padStart(2, "0")}</span><div><p><b>原句</b>{item.sentence}</p><p className="problem"><b>问题</b>{item.problem}。{item.reason}</p><p className="rewrite"><b>润色后</b>{item.rewrite}</p></div></article>)}</div></section>
  <section className="report-card"><div className="section-heading"><div><p className="eyebrow">保留原意的优化版</p><h2>修改后的完整续写</h2></div><span className="muted">不会覆盖原文</span></div><div className="polished">{report.polishedVersion}</div></section>
  </>; }
