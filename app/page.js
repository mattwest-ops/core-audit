"use client";
import { useState, useEffect } from "react";

const B = {
  black:"#0A0A0A", dark:"#111111", card:"#181818", border:"#242424",
  offwhite:"#F5F5F0", muted:"#888880", faint:"#333330",
  gold:"#B7860B", goldLight:"#D4A017", goldFade:"#B7860B22",
  green:"#4CAF50", amber:"#F5A623", red:"#E53935",
};

const RUBRIC = [
  { id:"gbp",         label:"GBP Presence & Health",  icon:"📍", phase:"CAPTURE",  desc:"Google Business Profile completeness and activity" },
  { id:"reviews",     label:"Review Authority",        icon:"⭐", phase:"CAPTURE",  desc:"Rating, volume, recency, owner responses" },
  { id:"visibility",  label:"Search Visibility",       icon:"🔍", phase:"CAPTURE",  desc:"Local Pack and keyword ranking for pain conditions" },
  { id:"conversion",  label:"Website Conversion",      icon:"🎯", phase:"OPTIMIZE", desc:"CTA clarity, booking flow, mobile, trust signals" },
  { id:"competitive", label:"Competitive Gap",         icon:"📊", phase:"ENHANCE",  desc:"Who's ranking ahead and running ads locally" },
];

const PHASE_COLOR = { CAPTURE:B.gold, OPTIMIZE:"#4F8EF7", RETAIN:B.amber, ENHANCE:"#9B59B6" };
const scoreColor  = p => p >= 70 ? B.green : p >= 40 ? B.amber : B.red;
const scoreLabel  = p => p >= 70 ? "STRONG" : p >= 40 ? "OPPORTUNITY" : "CRITICAL GAP";
const totalScore  = r => r ? Object.values(r.scores).reduce((s,c) => s + c.score, 0) : 0;

const SYSTEM_PROMPT = `You are a pre-call research analyst for Stoke Foundry. Audit a local business's Google presence using web search, then call the submit_audit tool with your findings. Do not narrate or explain — just search, score, and call the tool.

C.O.R.E. delivers: CAPTURE (GBP optimization + Google Ads) | OPTIMIZE (GHL automations) | RETAIN (SMS/email reactivation) | ENHANCE (Monthly Revenue Review). Applies to any local service business.

ONLY reference Google. Never mention Yelp, Facebook, Healthgrades, or other platforms.

SCORING — apply mechanically:

GBP (start 20): -5 unclaimed, -3 <10 photos, -3 no posts 60 days, -3 thin description, -2 no hours, -2 no Q&A. Floor 0.

REVIEWS (Google only): 0-9=4, 10-24=8, 25-49=11, 50-99=14, 100+=17. +2 if 4.5+, -2 if <4.0. +1 owner responds, -1 no responses. Cap 20.

VISIBILITY: search "[location] [type]" and "[location] [service]". Local Pack 2+ searches=16-20, 1 search=10-14, page 1 only=6-9, not visible=0-5.

WEBSITE (start 20): -5 no CTA, -4 no booking form, -4 not mobile, -3 no trust signals, -2 slow/outdated. Floor 0.

COMPETITIVE: name top 2-3 competitors ahead in local search. Check for Sponsored ads. In Pack+no ads=15-18, In Pack+ads=10-14, Not in Pack+no ads=6-9, Not in Pack+ads=0-5.

Run max 5 searches then call submit_audit immediately. Always search for the business's GBP directly before scoring — never assume review count or GBP status without a search result confirming it.`;

const AUDIT_TOOL = {
  name: "submit_audit",
  description: "Submit the completed audit with all scores and findings",
  input_schema: {
    type: "object",
    required: ["businessName","location","auditDate","summary","callHook","scores"],
    properties: {
      businessName: { type: "string" },
      location: { type: "string" },
      auditDate: { type: "string" },
      summary: { type: "string", description: "2-3 sentences on overall Google presence" },
      callHook: { type: "string", description: "2-3 sentences that open with a specific opportunity this business is positioned to capture — something concrete and local (a search position, a customer segment, a gap a competitor hasn't closed). Name one real competitor as a benchmark, not a threat. Close with a natural, low-pressure question or observation that invites a reply. No mention of scores, audits, frameworks, or Stoke Foundry. No jargon. Written the way a knowledgeable local contact would write it — direct, specific, human. Never start with 'We noticed', 'I came across', or any variation of 'we ran an audit on you'." },
      scores: {
        type: "object",
        required: ["gbp","reviews","visibility","conversion","competitive"],
        properties: {
          gbp:         { type:"object", required:["score","findings","recommendation"], properties:{ score:{type:"integer",minimum:0,maximum:20}, findings:{type:"array",items:{type:"string"},minItems:3,maxItems:3}, recommendation:{type:"string"} } },
          reviews:     { type:"object", required:["score","findings","recommendation"], properties:{ score:{type:"integer",minimum:0,maximum:20}, findings:{type:"array",items:{type:"string"},minItems:3,maxItems:3}, recommendation:{type:"string"} } },
          visibility:  { type:"object", required:["score","findings","recommendation"], properties:{ score:{type:"integer",minimum:0,maximum:20}, findings:{type:"array",items:{type:"string"},minItems:3,maxItems:3}, recommendation:{type:"string"} } },
          conversion:  { type:"object", required:["score","findings","recommendation"], properties:{ score:{type:"integer",minimum:0,maximum:20}, findings:{type:"array",items:{type:"string"},minItems:3,maxItems:3}, recommendation:{type:"string"} } },
          competitive: { type:"object", required:["score","findings","recommendation"], properties:{ score:{type:"integer",minimum:0,maximum:20}, findings:{type:"array",items:{type:"string"},minItems:3,maxItems:3}, recommendation:{type:"string"} } },
        }
      }
    }
  }
};

// ── Leave-behind HTML ─────────────────────────────────────────────────────────
function buildLeaveBehindHTML(r) {
  const t   = totalScore(r);
  const pct = Math.round((t / 100) * 100);
  const col = scoreColor(pct);
  const rows = RUBRIC.map(cat => {
    const s = r.scores[cat.id];
    const p = Math.round((s.score / 20) * 100);
    const c = scoreColor(p);
    return `<div class="cat">
      <div class="cat-head">
        <span>${cat.icon}</span>
        <div class="cat-title-wrap">
          <span class="cat-name">${cat.label}</span>
          <span class="phase-tag" style="color:${PHASE_COLOR[cat.phase]};background:${PHASE_COLOR[cat.phase]}22">${cat.phase}</span>
        </div>
        <div class="cat-score-wrap">
          <span class="cat-score" style="color:${c}">${s.score}<span class="denom">/20</span></span>
          <span class="cat-lbl" style="color:${c}">${scoreLabel(p)}</span>
        </div>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div>
      <ul>${s.findings.map(f=>`<li>${f}</li>`).join('')}</ul>
      <div class="rec" style="border-left:3px solid ${c}">
        <span class="rec-lbl" style="color:${c}">C.O.R.E. RECOMMENDATION</span>
        ${s.recommendation}
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>C.O.R.E. Audit — ${r.businessName || r.practiceName}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:#1a1a1a;font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.6;padding:40px 48px;max-width:820px;margin:0 auto}
@media print{.no-print{display:none!important} body{padding:24px 32px}}
.print-btn{display:block;margin:0 auto 28px;background:#B7860B;color:#fff;border:none;border-radius:6px;padding:11px 28px;font-family:'DM Sans',sans-serif;font-size:12px;letter-spacing:1px;font-weight:600;cursor:pointer}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #0A0A0A;margin-bottom:24px}
.brand{display:flex;align-items:center;gap:10px}
.brand-sq{width:34px;height:34px;background:#B7860B;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#fff}
.brand-name{font-family:'Syne',sans-serif;font-weight:700;font-size:12px;letter-spacing:1.5px}
.brand-sub{font-family:'DM Sans',sans-serif;font-size:9px;letter-spacing:1.5px;color:#888;margin-top:1px}
.report-lbl{font-family:'DM Sans',sans-serif;font-size:9px;letter-spacing:2px;color:#888;text-align:right}
.report-date{font-family:'DM Sans',sans-serif;font-size:11px;color:#444;text-align:right;margin-top:2px}
.hero{background:#0A0A0A;border-radius:8px;padding:24px 28px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.practice-name{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;color:#F5F5F0;margin-bottom:3px}
.practice-loc{font-size:12px;color:#888;margin-bottom:12px}
.summary{font-size:12px;color:#AAAAAA;line-height:1.7;max-width:380px;margin-bottom:12px}

.score-num{font-family:'Syne',sans-serif;font-weight:800;font-size:40px;line-height:1}
.score-sub{font-family:'DM Sans',sans-serif;font-size:10px;color:#555;margin-top:2px}
.score-lbl-hero{font-family:'DM Sans',sans-serif;font-size:9px;letter-spacing:2px;margin-top:4px}
.cat{background:#f9f9f7;border:1px solid #e8e8e4;border-radius:7px;padding:16px 18px;margin-bottom:8px}
.cat-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.cat-title-wrap{flex:1}
.cat-name{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;display:block}
.phase-tag{font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:3px;display:inline-block;margin-top:3px}
.cat-score-wrap{text-align:right}
.cat-score{font-family:'Syne',sans-serif;font-weight:800;font-size:18px}
.denom{font-size:10px;color:#888;font-weight:400}
.cat-lbl{font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:1.5px;display:block;margin-top:1px}
.bar-bg{height:2px;background:#e0e0da;border-radius:2px;margin-bottom:10px;overflow:hidden}
.bar-fill{height:100%;border-radius:2px}
ul{padding-left:16px;margin-bottom:10px}
li{font-size:12px;color:#555;line-height:1.6;margin-bottom:3px}
.rec{padding:9px 12px;background:#f0f0ec;border-radius:0 4px 4px 0;font-size:12px;color:#333;line-height:1.6}
.rec-lbl{font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:2px;display:block;margin-bottom:4px}
.footer{margin-top:24px;padding-top:18px;border-top:1px solid #e0e0da;display:flex;justify-content:space-between;align-items:center}
.footer-name{font-family:'Syne',sans-serif;font-weight:700;font-size:13px}
.footer-sub{font-family:'DM Sans',sans-serif;font-size:9px;color:#888;letter-spacing:1px;margin-top:1px}
.footer-right{font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;text-align:right}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>
<div class="header">
  <div class="brand">
    <div class="brand-sq">SF</div>
    <div><div class="brand-name">C.O.R.E. SYSTEM™</div><div class="brand-sub">PROSPECT READINESS AUDIT · STOKE FOUNDRY</div></div>
  </div>
  <div><div class="report-lbl">AUDIT REPORT</div><div class="report-date">${r.auditDate || new Date().toLocaleDateString()}</div></div>
</div>
<div class="hero">
  <div>
    <div class="practice-name">${r.businessName || r.practiceName}</div>
    <div class="practice-loc">📍 ${r.location}</div>
    <div class="summary">${r.summary}</div>
  </div>
  <div style="text-align:center;min-width:90px">
    <div class="score-num" style="color:${col}">${t}</div>
    <div class="score-sub">out of 100</div>
    <div class="score-lbl-hero" style="color:${col}">${scoreLabel(pct)}</div>
  </div>
</div>
${rows}
<div class="footer">
  <div><div class="footer-name">Stoke Foundry</div><div class="footer-sub">Capture · Optimize · Retain · Enhance</div></div>
  <div class="footer-right">Proudly Forged in El Segundo, CA<br/>stokefoundry.com</div>
</div>
</body></html>`;
}

export default function CoreAuditTool() {
  const [form, setForm]             = useState({ name:"", location:"", website:"" });
  const [stage, setStage]           = useState("input");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [results, setResults]       = useState(null);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const [savedAudits, setSavedAudits]   = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [saveStatus, setSaveStatus]     = useState(null);
  const [showLeaveBehind, setShowLeaveBehind] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("core_audits");
      if (saved) setSavedAudits(JSON.parse(saved));
    } catch(_) {}
  }, []);

  const LOADING_MESSAGES = [
    "Searching Google Business Profile…",
    "Checking review authority and recency…",
    "Analyzing local search visibility…",
    "Evaluating website conversion readiness…",
    "Scanning competitive landscape…",
    "Calculating C.O.R.E. readiness score…",
  ];

  const runAudit = async () => {
    if (!form.name || !form.location) return;
    setStage("loading"); setError(null);
    let idx = 0; setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 3000);
    try {
      const userMsg = `Audit this local business:\nName: ${form.name}\nLocation: ${form.location}\nWebsite: ${form.website || "unknown — search for it"}\n\nRun up to 5 web searches. You MUST search for and confirm: (1) their Google Business Profile — actual review count and rating as shown on Google, (2) their website and conversion signals, (3) local search visibility for "[location] [business type]", (4) top local competitors. Do NOT estimate or assume review counts — only report what search results confirm. Then immediately call submit_audit.`;

      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [
            { type:"web_search_20250305", name:"web_search" },
            AUDIT_TOOL,
          ],
          tool_choice: { type:"any" },
          messages: [{ role:"user", content: userMsg }],
        }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (data.error) throw new Error(data.error.message || "API error");
      // Extract the submit_audit tool call input
      const toolUse = (data.content||[]).find(b => b.type==="tool_use" && b.name==="submit_audit");
      if (!toolUse) throw new Error("Audit tool not called. Response: " + JSON.stringify(data.content||[]).slice(0,200));
      setResults({ ...toolUse.input, website: form.website });
      setStage("results");
    } catch(err) {
      clearInterval(interval);
      setError(err.message);
      setStage("input");
    }
  };

  const saveAudit = async () => {
    if (!results) return;
    setSaveStatus("saving");
    try {
      const entry = { id:Date.now(), savedAt:new Date().toLocaleDateString(),
        total:totalScore(results), data:results };
      const updated = [entry, ...savedAudits].slice(0,50);
      localStorage.setItem("core_audits", JSON.stringify(updated));
      setSavedAudits(updated);

      // Write to the Google Sheet database
      // NOTE: text/plain avoids a CORS preflight that Apps Script doesn't handle
      await fetch("https://script.google.com/macros/s/AKfycbzJGcaN5-QbTdFBlxyl1OteDCzq_C3aOIsg-WanjGoGsHvInckjoeHXzY7L9ZbA_OiI/exec", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(results),
      });

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2500);
    } catch(_) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const printLeaveBehind = () => {
    if (!results) return;
    const html = buildLeaveBehindHTML(results);
    const win  = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const loadSavedAudit = (entry) => {
    setResults(entry.data); setStage("results");
    setExpanded(null); setShowHistory(false);
  };

  const deleteSavedAudit = (id) => {
    const updated = savedAudits.filter(a => a.id !== id);
    localStorage.setItem("core_audits", JSON.stringify(updated));
    setSavedAudits(updated);
  };

  const t   = totalScore(results);
  const pct = Math.round((t / 100) * 100);

  const inputStyle = {
    width:"100%", background:"#0F0F0F", border:`1px solid ${B.border}`,
    borderRadius:"6px", color:B.offwhite, padding:"13px 16px",
    fontSize:"15px", fontFamily:"'DM Sans',sans-serif",
    outline:"none", transition:"border-color .2s",
  };

  const Btn = ({ onClick, children, style={} }) => (
    <button onClick={onClick} style={{ background:"transparent",
      border:`1px solid ${B.border}`, color:B.muted, padding:"8px 18px",
      borderRadius:"5px", cursor:"pointer",
      fontFamily:"'DM Sans',sans-serif", fontSize:"11px", letterSpacing:"1px",
      ...style }}>{children}</button>
  );

  const GoldBtn = ({ onClick, children }) => (
    <button onClick={onClick} style={{ background:B.gold, border:"none",
      color:B.black, padding:"9px 20px", borderRadius:"5px", cursor:"pointer",
      fontFamily:"'DM Sans',sans-serif", fontSize:"11px",
      letterSpacing:"1px", fontWeight:600 }}>{children}</button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap');
        *{box-sizing:border-box} body{margin:0} ::placeholder{color:#444440}
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight:"100vh", background:B.black,
        color:B.offwhite, fontFamily:"'DM Sans',sans-serif" }}>

        {/* HEADER */}
        <header style={{ borderBottom:`1px solid ${B.border}`, padding:"18px 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50, background:B.black }}>
          <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"6px",
              background:B.gold, display:"flex", alignItems:"center",
              justifyContent:"center", fontFamily:"'Syne',sans-serif",
              fontWeight:800, fontSize:"15px", color:B.black }}>SF</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                fontSize:"13px", letterSpacing:"2px" }}>C.O.R.E. SYSTEM™</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                color:B.muted, letterSpacing:"1.5px" }}>
                PROSPECT READINESS AUDIT · STOKE FOUNDRY</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            {savedAudits.length > 0 && (
              <Btn onClick={() => setShowHistory(!showHistory)}
                style={ showHistory ? { borderColor:B.gold, color:B.gold } : {} }>
                SAVED ({savedAudits.length})
              </Btn>
            )}
            {stage === "results" && (
              <Btn onClick={() => { setStage("input"); setResults(null); setExpanded(null); }}>
                NEW AUDIT
              </Btn>
            )}
          </div>
        </header>

        {/* HISTORY PANEL */}
        {showHistory && (
          <div style={{ background:B.dark, borderBottom:`1px solid ${B.border}`,
            padding:"20px 28px" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"10px",
              letterSpacing:"2px", color:B.muted, marginBottom:"14px" }}>SAVED AUDITS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {savedAudits.map(entry => {
                const p = Math.round((entry.total/100)*100);
                return (
                  <div key={entry.id} style={{ display:"flex", alignItems:"center",
                    gap:"14px", background:B.card, borderRadius:"7px",
                    padding:"12px 16px", cursor:"pointer" }}
                    onClick={() => loadSavedAudit(entry)}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600,
                        fontSize:"14px" }}>{entry.data.practiceName}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif",
                        fontSize:"10px", color:B.muted, marginTop:"2px" }}>
                        {entry.data.location} · {entry.savedAt}</div>
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:"18px", color:scoreColor(p) }}>
                      {entry.total}<span style={{ fontSize:"11px",
                        color:B.muted, fontWeight:400 }}>/100</span></div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                      color:scoreColor(p), letterSpacing:"1px" }}>{scoreLabel(p)}</div>
                    <button onClick={e => { e.stopPropagation(); deleteSavedAudit(entry.id); }}
                      style={{ background:"transparent", border:"none",
                        color:B.muted, cursor:"pointer", fontSize:"14px" }}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INPUT */}
        {stage === "input" && (
          <div style={{ maxWidth:"520px", margin:"60px auto", padding:"0 24px",
            animation:"fadeUp .35s ease" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
              fontSize:"36px", lineHeight:1.15, margin:"0 0 12px" }}>
              Prospect<br/>
              <em style={{ fontStyle:"italic", color:B.gold }}>Readiness Audit</em>
            </h1>
            <p style={{ color:B.muted, fontSize:"14px", lineHeight:1.7, margin:"0 0 36px" }}>
              Enter a practice. The tool searches their GBP, reviews, website, and local
              competitors — then scores readiness across the C.O.R.E. framework.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
              {[
                { key:"name",     label:"BUSINESS NAME", placeholder:"Ohana Montessori, South Bay PT...", req:true  },
                { key:"location", label:"CITY / AREA",   placeholder:"El Segundo, CA",              req:true  },
                { key:"website",  label:"WEBSITE",       placeholder:"southbaypt.com  (optional)",  req:false },
              ].map(({ key, label, placeholder, req }) => (
                <div key={key}>
                  <label style={{ display:"block", fontFamily:"'DM Sans',sans-serif",
                    fontSize:"10px", letterSpacing:"2px", color:B.gold, marginBottom:"7px" }}>
                    {label}{req && <span style={{ color:B.red }}> *</span>}
                  </label>
                  <input value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}
                    placeholder={placeholder} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = B.gold}
                    onBlur={e  => e.target.style.borderColor = B.border}
                    onKeyDown={e => e.key==="Enter" && runAudit()} />
                </div>
              ))}
              {error && (
                <div style={{ background:"#1A0808", border:`1px solid ${B.red}`,
                  borderRadius:"6px", padding:"12px 16px",
                  fontSize:"13px", color:B.red }}>{error}</div>
              )}
              <button onClick={runAudit} disabled={!form.name || !form.location} style={{
                marginTop:"4px",
                background:(!form.name||!form.location) ? B.faint : B.gold,
                border:"none", borderRadius:"6px",
                color:(!form.name||!form.location) ? B.muted : B.black,
                padding:"15px 24px", fontSize:"13px", letterSpacing:"2px",
                fontFamily:"'DM Sans',sans-serif", fontWeight:600,
                cursor:(!form.name||!form.location) ? "not-allowed" : "pointer",
              }}>RUN C.O.R.E. AUDIT →</button>
            </div>
            <div style={{ marginTop:"48px", paddingTop:"28px", borderTop:`1px solid ${B.border}` }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"10px",
                letterSpacing:"2px", color:B.muted, marginBottom:"14px" }}>SCORING RUBRIC</div>
              {RUBRIC.map(cat => (
                <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:"12px",
                  padding:"11px 0", borderBottom:`1px solid ${B.faint}` }}>
                  <span style={{ fontSize:"15px" }}>{cat.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:500 }}>{cat.label}</div>
                    <div style={{ fontSize:"11px", color:B.muted, marginTop:"2px" }}>{cat.desc}</div>
                  </div>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                    letterSpacing:"1px", color:PHASE_COLOR[cat.phase],
                    background:PHASE_COLOR[cat.phase]+"18",
                    padding:"2px 7px", borderRadius:"3px" }}>{cat.phase}</span>
                  <span style={{ fontSize:"11px", color:B.muted }}>/ 20</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOADING */}
        {stage === "loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", minHeight:"65vh", gap:"28px" }}>
            <div style={{ position:"relative", width:"72px", height:"72px" }}>
              <svg width="72" height="72" viewBox="0 0 72 72"
                style={{ animation:"spin 1.4s linear infinite", position:"absolute" }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke={B.faint} strokeWidth="3"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke={B.gold} strokeWidth="3"
                  strokeDasharray="188" strokeDashoffset="140" strokeLinecap="round"/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:"24px" }}>🔍</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                fontSize:"18px", marginBottom:"10px" }}>Auditing {form.name}</div>
              <div style={{ color:B.muted, fontSize:"14px" }}>{loadingMsg}</div>
            </div>
            <div style={{ display:"flex", gap:"6px" }}>
              {RUBRIC.map((_,i) => (
                <div key={i} style={{ width:"6px", height:"6px", borderRadius:"50%",
                  background:B.gold, animation:`pulse 1.4s ${i*.25}s infinite` }}/>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {stage === "results" && results && (
          <div style={{ maxWidth:"760px", margin:"0 auto", padding:"32px 24px 72px",
            animation:"fadeUp .35s ease" }}>
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px",
              justifyContent:"flex-end", flexWrap:"wrap" }}>
              <Btn onClick={saveAudit}
                style={ saveStatus==="saved" ? { borderColor:B.green, color:B.green } :
                        saveStatus==="error" ? { borderColor:B.red,   color:B.red   } : {} }>
                {saveStatus==="saving" ? "SAVING…" : saveStatus==="saved" ? "✓ SAVED" :
                 saveStatus==="error"  ? "SAVE FAILED" : "SAVE AUDIT"}
              </Btn>
              <GoldBtn onClick={printLeaveBehind}>⬇ LEAVE-BEHIND</GoldBtn>
            </div>

            {/* Hero */}
            <div style={{ background:B.dark, border:`1px solid ${B.border}`,
              borderRadius:"12px", padding:"28px", marginBottom:"16px",
              position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:"-50px", right:"-50px",
                width:"200px", height:"200px", borderRadius:"50%",
                background:`radial-gradient(circle, ${B.gold}12 0%, transparent 70%)`,
                pointerEvents:"none" }}/>
              <div style={{ display:"flex", alignItems:"flex-start",
                justifyContent:"space-between", flexWrap:"wrap", gap:"24px" }}>
                <div style={{ flex:1, minWidth:"220px" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                    letterSpacing:"2px", color:B.muted, marginBottom:"7px" }}>
                    AUDIT REPORT · {results.auditDate || new Date().toLocaleDateString()}</div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                    fontSize:"22px", margin:"0 0 3px" }}>{results.businessName || results.practiceName}</h2>
                  <div style={{ fontSize:"13px", color:B.muted, marginBottom:"18px" }}>
                    📍 {results.location}</div>
                  <p style={{ fontSize:"13px", lineHeight:1.7, color:"#AAAAAA",
                    margin:"0 0 16px", maxWidth:"400px" }}>{results.summary}</p>
                  <div style={{ background:B.goldFade, border:`1px solid ${B.gold}30`,
                    borderRadius:"7px", padding:"11px 14px",
                    fontSize:"13px", color:B.goldLight, lineHeight:1.6, maxWidth:"400px" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"8px",
                      letterSpacing:"2px", display:"block", marginBottom:"4px", opacity:.7 }}>
                      CALL HOOK</span>
                    📞 {results.callHook}
                  </div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ position:"relative", width:"104px", height:"104px",
                    margin:"0 auto 10px" }}>
                    <svg width="104" height="104" viewBox="0 0 104 104">
                      <circle cx="52" cy="52" r="44" fill="none" stroke={B.faint} strokeWidth="4"/>
                      <circle cx="52" cy="52" r="44" fill="none"
                        stroke={scoreColor(pct)} strokeWidth="4"
                        strokeDasharray={`${2*Math.PI*44}`}
                        strokeDashoffset={`${2*Math.PI*44*(1-pct/100)}`}
                        strokeLinecap="round"
                        style={{ transform:"rotate(-90deg)", transformOrigin:"center",
                          filter:`drop-shadow(0 0 6px ${scoreColor(pct)}60)` }}/>
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex",
                      flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                        fontSize:"28px", color:scoreColor(pct), lineHeight:1 }}>{t}</div>
                      <div style={{ fontFamily:"'DM Sans',sans-serif",
                        fontSize:"9px", color:B.muted }}>/100</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                    letterSpacing:"2px", color:scoreColor(pct), fontWeight:600 }}>
                    {scoreLabel(pct)}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", marginTop:"24px" }}>
                {RUBRIC.map(cat => {
                  const p = Math.round((results.scores[cat.id].score/20)*100);
                  return (
                    <div key={cat.id} style={{ flex:1, textAlign:"center" }}>
                      <div style={{ height:"2px", background:B.faint, borderRadius:"2px",
                        marginBottom:"5px", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${p}%`,
                          background:scoreColor(p), borderRadius:"2px" }}/>
                      </div>
                      <span style={{ fontSize:"11px" }}>{cat.icon}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {RUBRIC.map(cat => {
                const s   = results.scores[cat.id];
                const p   = Math.round((s.score/20)*100);
                const col = scoreColor(p);
                const open = expanded === cat.id;
                return (
                  <div key={cat.id}
                    onClick={() => setExpanded(open ? null : cat.id)}
                    style={{ background:B.dark,
                      border:`1px solid ${open ? col+"50" : B.border}`,
                      borderRadius:"10px", padding:"18px 22px",
                      cursor:"pointer", transition:"border-color .2s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <span style={{ fontSize:"17px" }}>{cat.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center",
                          gap:"8px", flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:600,
                            fontSize:"14px" }}>{cat.label}</span>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"8px",
                            letterSpacing:"1px", color:PHASE_COLOR[cat.phase],
                            background:PHASE_COLOR[cat.phase]+"18",
                            padding:"2px 6px", borderRadius:"3px" }}>{cat.phase}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right", marginRight:"6px" }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                          fontSize:"21px", color:col, lineHeight:1 }}>
                          {s.score}<span style={{ fontSize:"11px",
                            color:B.muted, fontWeight:400 }}>/20</span></div>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"8px",
                          letterSpacing:"1.5px", color:col }}>{scoreLabel(p)}</div>
                      </div>
                      <div style={{ color:B.muted, fontSize:"13px",
                        transform:open?"rotate(180deg)":"rotate(0)",
                        transition:"transform .2s" }}>▾</div>
                    </div>
                    <div style={{ height:"2px", background:B.faint, borderRadius:"2px",
                      marginTop:"12px", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`,
                        background:col, borderRadius:"2px" }}/>
                    </div>
                    {open && (
                      <div style={{ marginTop:"18px", paddingTop:"18px",
                        borderTop:`1px solid ${B.border}` }}>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"9px",
                          letterSpacing:"2px", color:B.muted, marginBottom:"10px" }}>FINDINGS</div>
                        {s.findings.map((f,i) => (
                          <div key={i} style={{ display:"flex", gap:"10px",
                            alignItems:"flex-start", marginBottom:"8px" }}>
                            <div style={{ width:"4px", height:"4px", borderRadius:"50%",
                              background:col, marginTop:"6px", flexShrink:0 }}/>
                            <div style={{ fontSize:"13px", color:"#AAAAAA",
                              lineHeight:1.6 }}>{f}</div>
                          </div>
                        ))}
                        <div style={{ background:col+"10", border:`1px solid ${col}28`,
                          borderRadius:"6px", padding:"12px 14px", marginTop:"4px" }}>
                          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"8px",
                            letterSpacing:"2px", color:col, marginBottom:"5px" }}>
                            C.O.R.E. RECOMMENDATION</div>
                          <div style={{ fontSize:"13px", color:B.offwhite,
                            lineHeight:1.65 }}>{s.recommendation}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:"28px", textAlign:"center",
              padding:"22px", borderTop:`1px solid ${B.border}` }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                fontSize:"14px", marginBottom:"3px" }}>Stoke Foundry</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"10px",
                color:B.muted, letterSpacing:"1px" }}>
                C.O.R.E. System™ · Capture · Optimize · Retain · Enhance</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
