"use client";

import { useState } from "react";

const TABS = [
  {
    id: "band",
    label: "为什么进入这一档",
    body: {
      lead: "第四档 · 16—20 · 档内中位",
      note: "四项内容标准共同定档，语言整体表现决定档内位置。",
      rows: [
        { label: "解决矛盾", status: "轻微瑕疵", text: "主人公自己作出了选择，但转折前缺少一处犹豫，破局略显轻快。" },
        { label: "文本衔接", status: "表现充分", text: "P2 首句所需的动作前提已在 P1 建立。" },
        { label: "主题升华", status: "轻微瑕疵", text: "方向与原文一致，但结尾的认识停在表层。" },
        { label: "情节合理性", status: "表现充分", text: "人物状态与原文事实没有冲突。" },
      ],
    },
  },
  {
    id: "theme",
    label: "主题是否降格",
    body: {
      lead: "方向一致但较浅",
      note: "原文的认知终点优先于通用励志表述。",
      trace: [
        { stage: "原文初始观念", text: "写作只是写给自己看的事，比赛意味着被比较。" },
        { stage: "情节发展", text: "在限时命题下，每句话都像是写给评委看的。" },
        { stage: "原文认知终点", text: "真实比得体更重要，写作的价值不来自名次。" },
        { stage: "学生结尾", text: "点明了不需要评委认可，但主人公的心理转变写得偏简略。" },
      ],
    },
  },
  {
    id: "cohesion",
    label: "P1 铺垫是否到位",
    body: {
      lead: "P2 首句所需前提逐项核对",
      note: "只检查 P2 明确回指的信息，不要求机械复述。",
      rows: [
        { label: "已放下笔", status: "已建立", text: "P1 写到他停止计算别人写了多少行，动作前提成立。" },
        { label: "完成了一篇文章", status: "已建立", text: "P1 结尾写到铃响时页面终于属于自己。" },
        { label: "未进前三", status: "首句自足", text: "结果由 P2 首句自行引入，P1 无需预告。" },
      ],
    },
  },
  {
    id: "sentence",
    label: "原句 → 问题 → 润色后",
    body: {
      lead: "逐句精修只处理学生原创",
      note: "给定首句锁定，不参与语言纠错。",
      sentences: [
        {
          origin: "He thought about his grandfather's boat and the sound of water against old wood.",
          problem: "细节准确，但心理转折缺少落点",
          reason: "读者看到画面，却没看到他为什么在此刻放下了讨好评委的念头。",
          rewrite: "He thought about his grandfather's boat, and for the first time that afternoon the page stopped feeling like a test.",
        },
      ],
    },
  },
  {
    id: "next",
    label: "下一次写作重点",
    body: {
      lead: "两条可执行的修改方向",
      note: "按对档位影响排序，先改内容再改语言。",
      rows: [
        { label: "优先", status: "内容", text: "在结尾补一处主人公自己的认识，而不是由老师说出主题。" },
        { label: "其次", status: "语言", text: "把两处并列句改成带状语的复合句，让节奏有变化。" },
      ],
    },
  },
] as const;

const STATUS_TONE: Record<string, string> = {
  表现充分: "status-good",
  已建立: "status-good",
  首句自足: "status-good",
  轻微瑕疵: "status-warn",
  内容: "status-warn",
  语言: "status-good",
};

export function ReportPreview() {
  const [active, setActive] = useState<string>(TABS[0].id);
  const current = TABS.find(tab => tab.id === active) ?? TABS[0];
  return (
    <div className="lp-preview">
      <div className="lp-preview-tabs" role="tablist" aria-label="报告内容预览">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`preview-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`preview-panel-${tab.id}`}
            className={active === tab.id ? "current" : ""}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="lp-preview-panel"
        role="tabpanel"
        id={`preview-panel-${current.id}`}
        aria-labelledby={`preview-tab-${current.id}`}
      >
        <div className="lp-preview-lead">
          <b>{current.body.lead}</b>
          <p>{current.body.note}</p>
        </div>
        {"rows" in current.body && (
          <ul className="lp-preview-rows">
            {current.body.rows.map(row => (
              <li key={row.label}>
                <span className="lp-row-label">{row.label}</span>
                <span className={`lp-row-status ${STATUS_TONE[row.status] ?? ""}`}>{row.status}</span>
                <p>{row.text}</p>
              </li>
            ))}
          </ul>
        )}
        {"trace" in current.body && (
          <ol className="lp-trace">
            {current.body.trace.map(item => (
              <li key={item.stage}>
                <span>{item.stage}</span>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        )}
        {"sentences" in current.body && (
          <div className="lp-sentences">
            {current.body.sentences.map(item => (
              <article key={item.origin}>
                <p className="lp-origin">{item.origin}</p>
                <p className="lp-problem">
                  <b>问题</b>
                  {item.problem}。{item.reason}
                </p>
                <p className="lp-rewrite">
                  <b>润色后</b>
                  {item.rewrite}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
