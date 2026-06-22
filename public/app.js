const STORAGE_KEY = "vector_welcome_v4";
const THEME_KEY = "vector_theme";

const els = {
  signalsBody: document.getElementById("signalsBody"),
  decisionBody: document.getElementById("decisionBody"),
  portfolioBody: document.getElementById("portfolioBody"),
  tribunal: document.getElementById("tribunal"),
  reasoning: document.getElementById("reasoning"),
  reasoningText: document.getElementById("reasoningText"),
  agentPlanText: document.getElementById("agentPlanText"),
  agentReflectionText: document.getElementById("agentReflectionText"),
  agentNextFocus: document.getElementById("agentNextFocus"),
  agentTranscriptBody: document.getElementById("agentTranscriptBody"),
  speakTranscriptBtn: document.getElementById("speakTranscriptBtn"),
  agentPanel: document.getElementById("agentPanel"),
  agentOrb: document.getElementById("agentOrb"),
  agentVerdictWrap: document.getElementById("agentVerdictWrap"),
  tribunalJury: document.getElementById("tribunalJury"),
  agentStatus: document.getElementById("agentStatus"),
  agentVerdict: document.getElementById("agentVerdict"),
  agentVerdictMeta: document.getElementById("agentVerdictMeta"),
  agentModel: document.getElementById("agentModel"),
  agentPlan: document.getElementById("agentPlan"),
  agentReflection: document.getElementById("agentReflection"),
  agentMemoryList: document.getElementById("agentMemoryList"),
  agentSteps: document.getElementById("agentSteps"),
  journal: document.getElementById("journal"),
  journalCount: document.getElementById("journalCount"),
  journalRefreshBtn: document.getElementById("journalRefreshBtn"),
  modeBadge: document.getElementById("modeBadge"),
  conflictBadge: document.getElementById("conflictBadge"),
  profileSelect: document.getElementById("profileSelect"),
  profileMeta: document.getElementById("profileMeta"),
  weightBars: document.getElementById("weightBars"),
  runBtn: document.getElementById("runBtn"),
  helpBtn: document.getElementById("helpBtn"),
  themeBtn: document.getElementById("themeBtn"),
  menuBtn: document.getElementById("menuBtn"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  navSignals: document.getElementById("navSignals"),
  navAgent: document.getElementById("navAgent"),
  navJournal: document.getElementById("navJournal"),
  error: document.getElementById("error"),
  sources: document.getElementById("sources"),
  livePrice: document.getElementById("livePrice"),
  pipeline: document.getElementById("pipeline"),
  overlay: document.getElementById("overlay"),
  overlayStep: document.getElementById("overlayStep"),
  overlayHint: document.getElementById("overlayHint"),
  progressFill: document.getElementById("progressFill"),
  welcomeModal: document.getElementById("welcomeModal"),
  startBtn: document.getElementById("startBtn"),
  skipWelcome: document.getElementById("skipWelcome"),
  autopilotBadge: document.getElementById("autopilotBadge"),
  autopilotPhase: document.getElementById("autopilotPhase"),
  autopilotCycles: document.getElementById("autopilotCycles"),
  autopilotNext: document.getElementById("autopilotNext"),
  autopilotLast: document.getElementById("autopilotLast"),
  autopilotLog: document.getElementById("autopilotLog"),
  autopilotStartBtn: document.getElementById("autopilotStartBtn"),
  autopilotStopBtn: document.getElementById("autopilotStopBtn"),
  settingsForm: document.getElementById("settingsForm"),
  settingSymbol: document.getElementById("settingSymbol"),
  settingInterval: document.getElementById("settingInterval"),
  settingNotional: document.getElementById("settingNotional"),
  settingLeverage: document.getElementById("settingLeverage"),
  settingDryRun: document.getElementById("settingDryRun"),
  settingsHint: document.getElementById("settingsHint"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  navAutopilot: document.getElementById("navAutopilot"),
  navSettings: document.getElementById("navSettings"),
  verdictBar: document.getElementById("verdictBar"),
  verdictBarAction: document.getElementById("verdictBarAction"),
  verdictBarSymbol: document.getElementById("verdictBarSymbol"),
  verdictBarConf: document.getElementById("verdictBarConf"),
  verdictBarEquity: document.getElementById("verdictBarEquity"),
  verdictBarCycles: document.getElementById("verdictBarCycles"),
  verdictBarWinRate: document.getElementById("verdictBarWinRate"),
  verdictBarLast: document.getElementById("verdictBarLast"),
  verdictBarSignals: document.getElementById("verdictBarSignals"),
  firstLoadHint: document.getElementById("firstLoadHint"),
  dismissHint: document.getElementById("dismissHint"),
  tribunalHero: document.getElementById("tribunalHero"),
  tribunalHeroBadge: document.getElementById("tribunalHeroBadge"),
  heroChannels: document.getElementById("heroChannels"),
  heroConsensus: document.getElementById("heroConsensus"),
  heroVerdict: document.getElementById("heroVerdict"),
  heroSources: document.getElementById("heroSources"),
};

let profiles = [];
let activeProfileId = "balanced";
let meta = null;
let cycleTimer = null;
let pollTimer = null;
let charts = { equity: null, activity: null, signals: null, walletSpark: null, decisionConf: null };
let lastChartData = { portfolio: null, cycles: [], latest: null, maxNotionalUsdt: 100 };
let hasBitgetAuth = false;

const CYCLE_STEPS = [
  { label: "Pulling live Bitget ticker", hint: "Price, candles, funding rate", pct: 15, agentStep: "perceive" },
  { label: "Reading the news", hint: "Exa search · last 24 hours", pct: 30, agentStep: "perceive" },
  { label: "Checking Solana on-chain", hint: "DexScreener flow + activity", pct: 45, agentStep: "memory" },
  { label: "The jury is voting", hint: "Technical · Funding · News · On-chain", pct: 58, agentStep: "tribunal" },
  { label: "Qwen is weighing the votes", hint: "30–50s · reconciling conflict", pct: 85, agentStep: "plan" },
  { label: "Writing to the journal", hint: "Audit trail + paper wallet", pct: 100, agentStep: "act" },
];

const TRIBUNAL_JURORS = [
  { key: "technical", label: "Technical", short: "TA" },
  { key: "funding", label: "Funding", short: "FD" },
  { key: "news", label: "News", short: "NW" },
  { key: "onchain", label: "On-chain", short: "OC" },
];

const CHANNEL_HINTS = {
  technical: "Price action + candle momentum",
  funding: "Perp funding rate · crowd positioning",
  news: "Exa headlines · 24h sentiment",
  onchain: "Solana DEX volume + flow",
};

function hintForChannel(key) {
  return CHANNEL_HINTS[key] ?? "Awaiting cycle";
}

let juryAnimTimer = null;
let typewriterGen = 0;
let lastTranscriptSpeech = "";

function voteClass(v) {
  return `vote-${v}`;
}

function actionClass(a) {
  if (a === "long") return "action-long";
  if (a === "short") return "action-short";
  return "action-hold";
}

function statusClass(a) {
  if (a === "long") return "status-long";
  if (a === "short") return "status-short";
  return "status-hold";
}

function kindBadge(kind) {
  const m = {
    live: '<span class="badge badge-live">Live</span>',
    simulated: '<span class="badge badge-sim">Sim</span>',
    ai: '<span class="badge badge-ai">AI</span>',
    off: '<span class="badge badge-off">Off</span>',
  };
  return m[kind] ?? m.off;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error("API not reachable. Start the server with: pnpm api");
    }
    throw new Error(`Expected JSON from ${url}`);
  }

  const data = JSON.parse(text);
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

function renderEmptyDashboard() {
  renderSignalsCard(null);
  renderDecisionCard(
    { action: "hold", confidence: 0, notionalUsdt: 0, leverage: 1, stopLossPct: null, takeProfitPct: null },
    null,
    null,
    lastChartData.maxNotionalUsdt ?? 100
  );
  renderPortfolioCard(null, null);
  renderTribunal(null);
  renderTribunalJury(null);
  renderTribunalHero(null, null, null);
  renderVerdictBar(null, null, null);
  renderJournal([]);
  renderCharts(null, [], null);
  renderAutopilot({
    running: false,
    phase: "idle",
    cyclesCompleted: 0,
    nextCycleAt: null,
    lastCycleAt: null,
    log: [],
  });
  setAgentState("idle", "Idle · waiting for cycle");
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.add("visible");
}

function clearError() {
  els.error.classList.remove("visible");
}

function showWelcome() {
  if (!els.welcomeModal) return;
  els.welcomeModal.hidden = true;
  els.welcomeModal.classList.remove("open");
}

function closeWelcome() {
  if (!els.welcomeModal) return;
  els.welcomeModal.classList.remove("open");
  els.welcomeModal.hidden = true;
  localStorage.setItem(STORAGE_KEY, "1");
}

function showFirstLoadHint() {
  if (!els.firstLoadHint) return;
  if (localStorage.getItem(STORAGE_KEY)) {
    els.firstLoadHint.hidden = true;
    return;
  }
  els.firstLoadHint.hidden = false;
  setTimeout(() => {
    if (els.firstLoadHint && !els.firstLoadHint.hidden) {
      els.firstLoadHint.classList.add("fading");
      setTimeout(() => {
        els.firstLoadHint.hidden = true;
        els.firstLoadHint.classList.remove("fading");
      }, 600);
    }
  }, 12000);
}

function dismissFirstLoadHint() {
  if (!els.firstLoadHint) return;
  els.firstLoadHint.hidden = true;
  localStorage.setItem(STORAGE_KEY, "1");
}

function scrollTo(id) {
  closeSidebar();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getTheme() {
  return localStorage.getItem(THEME_KEY) ?? "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  updateFavicon(theme);
}

function updateFavicon(theme = getTheme()) {
  const link = document.getElementById("favicon");
  if (!link) return;
  link.href = theme === "light" ? "/assets/favicon-light.svg" : "/assets/favicon.svg";
}

function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
  renderCharts(lastChartData.portfolio, lastChartData.cycles, lastChartData.latest);
  if (lastChartData.latest) {
    const d = lastChartData.latest.riskVerdict?.adjustedDecision ?? lastChartData.latest.rawDecision;
    renderDecisionCard(d, lastChartData.latest.execution, lastChartData.latest.tribunal, lastChartData.maxNotionalUsdt);
    renderPortfolioCard(lastChartData.portfolio, lastChartData.latest.perception?.market?.lastPrice ?? null);
  } else {
    renderPortfolioCard(lastChartData.portfolio, null);
  }
}

function openSidebar() {
  els.sidebar.classList.add("open");
  els.sidebarBackdrop.classList.add("open");
}

function closeSidebar() {
  els.sidebar.classList.remove("open");
  els.sidebarBackdrop.classList.remove("open");
}

function setDeliberating(on) {
  els.agentVerdictWrap?.classList.toggle("deliberating", on);
  if (on) {
    els.agentVerdict.textContent = "···";
    els.agentVerdict.className = "agent-verdict-action deliberating";
    els.agentVerdictMeta.textContent = "Agent deliberating — reading tribunal votes…";
  }
}

function stopJuryAnimation() {
  if (juryAnimTimer) clearTimeout(juryAnimTimer);
  juryAnimTimer = null;
}

function renderTribunalJury(tribunal, options = {}) {
  if (!els.tribunalJury) return;

  els.tribunalJury.innerHTML = TRIBUNAL_JURORS.map((juror, index) => {
    const channel = tribunal?.channels?.find((c) => c.key === juror.key);
    const vote = channel?.vote ?? "neutral";
    const active = options.activeIndex === index;
    const pending = options.deliberating && !channel;

    return `
      <div class="juror ${voteClass(vote)} ${active ? "juror-active" : ""} ${pending ? "juror-pending" : ""}" data-juror="${juror.key}">
        <div class="juror-avatar">${juror.short}</div>
        <div class="juror-name">${juror.label}</div>
        <div class="juror-vote">${channel ? vote : "…"}</div>
        ${channel ? `<div class="juror-score">${channel.score > 0 ? "+" : ""}${channel.score}</div>` : ""}
      </div>`;
  }).join("");
}

function startJuryDeliberation() {
  stopJuryAnimation();
  let index = 0;

  const tick = () => {
    renderTribunalJury(null, { deliberating: true, activeIndex: index });
    index = (index + 1) % TRIBUNAL_JURORS.length;
    juryAnimTimer = setTimeout(tick, 650);
  };

  tick();
}

function cancelTypewriters() {
  typewriterGen += 1;
}

function typewriter(el, text, options = {}) {
  const gen = typewriterGen;
  const speed = options.speed ?? 10;
  const startDelay = options.delay ?? 0;

  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    const run = () => {
      el.textContent = "";
      el.classList.add("typewriting");
      let index = 0;

      const tick = () => {
        if (gen !== typewriterGen) {
          el.classList.remove("typewriting");
          resolve();
          return;
        }
        if (index >= text.length) {
          el.classList.remove("typewriting");
          resolve();
          return;
        }
        el.textContent += text[index];
        index += 1;
        setTimeout(tick, speed);
      };

      tick();
    };

    if (startDelay > 0) setTimeout(run, startDelay);
    else run();
  });
}

async function typewriterSequence(entries) {
  for (const entry of entries) {
    if (!entry?.el || !entry.text) continue;
    await typewriter(entry.el, entry.text, entry);
  }
}

function buildTranscriptLines(decision, agentContext, tribunal) {
  const lines = [];
  const action = (decision?.action ?? "hold").toUpperCase();
  const confidence = ((decision?.confidence ?? 0) * 100).toFixed(0);

  if (tribunal?.channels?.length) {
    const summary = tribunal.channels.map((c) => `${c.name} ${c.vote}`).join(", ");
    lines.push({
      role: "system",
      label: "Tribunal",
      text: `Four channels voted. ${summary}. Consensus: ${tribunal.consensus}.`,
    });
  }

  lines.push({
    role: "agent",
    label: "Vector",
    text: `Verdict: ${action}. Confidence ${confidence} percent.`,
  });

  const plan = agentContext?.plan ?? decision?.plan;
  if (plan) lines.push({ role: "agent", label: "Vector", text: plan });

  if (decision?.reasoning) {
    lines.push({ role: "agent", label: "Vector", text: decision.reasoning });
  }

  if (agentContext?.reflection) {
    lines.push({ role: "agent", label: "Vector", text: agentContext.reflection });
  }

  if (agentContext?.nextFocus) {
    lines.push({
      role: "system",
      label: "Focus",
      text: `Next cycle focus: ${agentContext.nextFocus}`,
    });
  }

  return lines;
}

function transcriptSpeechText(lines) {
  return lines.map((line) => line.text).join(" ");
}

async function renderTranscript(lines, options = {}) {
  if (!els.agentTranscriptBody) return;

  cancelTypewriters();
  const gen = typewriterGen;

  if (!lines.length) {
    els.agentTranscriptBody.innerHTML =
      '<p class="transcript-placeholder">Transcript appears after each cycle — tribunal votes, verdict, plan, and reflection.</p>';
    if (els.speakTranscriptBtn) els.speakTranscriptBtn.disabled = true;
    lastTranscriptSpeech = "";
    return;
  }

  els.agentTranscriptBody.innerHTML = "";
  lastTranscriptSpeech = transcriptSpeechText(lines);
  if (els.speakTranscriptBtn) els.speakTranscriptBtn.disabled = false;

  for (const line of lines) {
    if (gen !== typewriterGen) return;

    const row = document.createElement("div");
    row.className = `transcript-line role-${line.role}`;
    row.innerHTML = `
      <span class="transcript-meta">${line.label}</span>
      <div class="transcript-bubble"></div>`;
    const bubble = row.querySelector(".transcript-bubble");
    els.agentTranscriptBody.appendChild(row);

    if (options.instant) {
      bubble.textContent = line.text;
    } else {
      await typewriter(bubble, line.text, { speed: 8 });
    }

    els.agentTranscriptBody.scrollTop = els.agentTranscriptBody.scrollHeight;
  }
}

function stopTranscriptSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  els.speakTranscriptBtn?.classList.remove("speaking");
  if (els.speakTranscriptBtn) els.speakTranscriptBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
    Listen`;
}

function speakTranscript() {
  if (!lastTranscriptSpeech || !window.speechSynthesis) return;

  if (window.speechSynthesis.speaking) {
    stopTranscriptSpeech();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(lastTranscriptSpeech);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = stopTranscriptSpeech;
  utterance.onerror = stopTranscriptSpeech;

  els.speakTranscriptBtn?.classList.add("speaking");
  if (els.speakTranscriptBtn) {
    els.speakTranscriptBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Stop`;
  }

  window.speechSynthesis.speak(utterance);
}

function setAgentState(state, text) {
  els.agentPanel.classList.remove("thinking", "ready", "idle");
  els.agentPanel.classList.add(state);
  els.agentOrb.classList.toggle("pulse", state === "thinking");
  if (text) els.agentStatus.textContent = text;
}

function setAgentSteps(activeStep) {
  if (!els.agentSteps) return;
  els.agentSteps.querySelectorAll(".agent-step").forEach((el) => {
    el.classList.toggle("active", el.dataset.step === activeStep);
    el.classList.toggle("done", false);
  });
}

async function renderAgent(decision, execution, reasoningText, agentContext, journalCycles, tribunal, options = {}) {
  const labels = { long: "LONG", short: "SHORT", hold: "HOLD", close: "CLOSE" };
  const action = decision?.action ?? "hold";
  const hasCycle = Boolean(decision?.reasoning || agentContext?.plan);
  const instant = Boolean(options.quiet || options.instant);

  els.agentVerdict.textContent = labels[action] ?? action.toUpperCase();
  els.agentVerdict.className = `agent-verdict-action ${actionClass(action)} verdict-slam`;
  setTimeout(() => els.agentVerdict.classList.remove("verdict-slam"), 520);
  els.agentVerdictMeta.textContent = decision
    ? `Confidence ${(decision.confidence * 100).toFixed(0)}% · ${execution?.status ?? "pending"}`
    : "Run a cycle to get an agent decision";

  const planText = agentContext?.plan ?? decision?.plan;
  const reflection = agentContext?.reflection;
  const nextFocus = agentContext?.nextFocus;
  const transcriptLines = hasCycle ? buildTranscriptLines(decision, agentContext, tribunal) : [];

  cancelTypewriters();

  if (!hasCycle) {
    const idlePlan = "Run a cycle to see the agent state its intent before trading.";
    const idleReasoning =
      "Agent reasoning will appear here after each cycle. The model reads memory, signal votes, reconciles conflicts, and explains the trade call.";
    const idleReflection = "After each cycle the agent reviews what happened and sets focus for the next run.";

    if (instant) {
      if (els.agentPlanText) els.agentPlanText.textContent = idlePlan;
      if (els.reasoningText) els.reasoningText.textContent = idleReasoning;
      if (els.agentReflectionText) els.agentReflectionText.textContent = idleReflection;
    } else {
      void typewriterSequence([
        { el: els.agentPlanText, text: idlePlan, delay: 200 },
        { el: els.reasoningText, text: idleReasoning, delay: 0 },
        { el: els.agentReflectionText, text: idleReflection, delay: 0 },
      ]);
    }
    if (els.agentNextFocus) {
      els.agentNextFocus.hidden = true;
      els.agentNextFocus.textContent = "";
    }
    void renderTranscript([], { instant });
  } else {
    const planCopy = planText ?? "No plan recorded for this cycle.";
    const reasoningCopy = reasoningText ?? "No reasoning returned.";
    const reflectionCopy = reflection ?? "No reflection recorded.";

    if (instant) {
      if (els.agentPlanText) els.agentPlanText.textContent = planCopy;
      if (els.reasoningText) els.reasoningText.textContent = reasoningCopy;
      if (els.agentReflectionText) els.agentReflectionText.textContent = reflectionCopy;
      if (els.agentNextFocus) {
        if (nextFocus) {
          els.agentNextFocus.hidden = false;
          els.agentNextFocus.textContent = `Next focus: ${nextFocus}`;
        } else {
          els.agentNextFocus.hidden = true;
          els.agentNextFocus.textContent = "";
        }
      }
      void renderTranscript(transcriptLines, { instant: true });
    } else {
      const stream = [
        { el: els.agentPlanText, text: planCopy, speed: 9 },
        { el: els.reasoningText, text: reasoningCopy, speed: 7 },
        { el: els.agentReflectionText, text: reflectionCopy, speed: 9 },
      ];
      void typewriterSequence(stream).then(() => {
        if (els.agentNextFocus) {
          if (nextFocus) {
            els.agentNextFocus.hidden = false;
            return typewriter(els.agentNextFocus, `Next focus: ${nextFocus}`, { speed: 10 });
          }
          els.agentNextFocus.hidden = true;
          els.agentNextFocus.textContent = "";
        }
      });
      void renderTranscript(transcriptLines);
    }
  }

  if (els.agentMemoryList) {
    const recent = (journalCycles ?? []).slice(0, 5);
    if (!recent.length) {
      els.agentMemoryList.innerHTML = '<p class="stat-meta">No prior cycles in memory yet.</p>';
    } else {
      els.agentMemoryList.innerHTML = recent
        .map((cy) => {
          const d = cy.riskVerdict?.adjustedDecision ?? cy.rawDecision;
          return `<div class="memory-chip"><span class="${statusClass(d.action)}">${d.action}</span> ${cy.symbol} · $${(cy.portfolio?.equity ?? 0).toFixed(0)}</div>`;
        })
        .join("");
    }
  }

  setAgentState("ready", agentContext?.memoryUsed ? `Online · ${agentContext.memoryUsed} cycles in memory` : "Online · last cycle complete");
  setAgentSteps("reflect");
}

function renderPipeline(activeIndex = -1, allDone = false) {
  if (!meta?.pipeline) {
    els.pipeline.innerHTML = CYCLE_STEPS.map((s, i) => {
      let cls = "pipe-item";
      if (allDone) cls += " done";
      else if (i === activeIndex) cls += " active";
      return `
        <div class="${cls}">
          <div class="pipe-dot"></div>
          <div>
            <div class="label">${s.label}</div>
            <div class="hint">${s.hint}</div>
          </div>
        </div>`;
    }).join("");
    return;
  }

  els.pipeline.innerHTML = meta.pipeline
    .map((step, i) => {
      let cls = "pipe-item";
      if (allDone || i < activeIndex) cls += " done";
      else if (i === activeIndex) cls += " active";
      return `
        <div class="${cls}">
          <div class="pipe-dot"></div>
          <div>
            <div class="label">${step.label}</div>
          </div>
        </div>`;
    })
    .join("");
}

function renderSources() {
  if (!meta?.dataSources) return;
  els.sources.innerHTML = meta.dataSources
    .map(
      (s) => `
      <div class="source-chip">
        ${kindBadge(s.kind)}
        <div><strong>${s.label}</strong> <span>${s.provider}</span></div>
      </div>`
    )
    .join("");
}

function renderProfiles() {
  els.profileSelect.innerHTML = "";
  for (const p of profiles) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activeProfileId) opt.selected = true;
    els.profileSelect.appendChild(opt);
  }
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartTheme() {
  return {
    text: cssVar("--text-muted"),
    grid: cssVar("--border"),
    accent: cssVar("--accent"),
    purple: cssVar("--purple"),
    cyan: cssVar("--cyan"),
    green: cssVar("--green"),
    red: cssVar("--red"),
  };
}

function destroyCharts() {
  for (const key of Object.keys(charts)) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }
}

function destroyCardChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
}

function renderWalletSparkline(portfolio) {
  if (typeof Chart === "undefined") return;
  destroyCardChart("walletSpark");

  const canvas = document.getElementById("walletSparkChart");
  if (!canvas) return;

  const c = chartTheme();
  const equityData = portfolio?.equityCurve?.length
    ? portfolio.equityCurve
    : [{ ts: new Date().toISOString(), equity: portfolio?.equity ?? 1000 }];
  const values = equityData.map((p) => p.equity);
  const start = values[0] ?? 1000;
  const end = values[values.length - 1] ?? start;
  const up = end >= start;

  charts.walletSpark = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: values.map((_, i) => i),
      datasets: [
        {
          data: values,
          borderColor: up ? c.green : c.red,
          backgroundColor: up ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  });
}

function renderDecisionConfidence(decision) {
  if (typeof Chart === "undefined") return;
  destroyCardChart("decisionConf");

  const canvas = document.getElementById("decisionConfChart");
  if (!canvas) return;

  const c = chartTheme();
  const pct = Math.round((decision.confidence ?? 0) * 100);
  const action = decision.action ?? "hold";
  const color =
    action === "long" ? c.green : action === "short" ? c.red : action === "close" ? c.purple : c.cyan;

  charts.decisionConf = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Confidence", "Remainder"],
      datasets: [
        {
          data: [pct, 100 - pct],
          backgroundColor: [color, "rgba(148, 163, 184, 0.15)"],
          borderWidth: 0,
          hoverOffset: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
    plugins: [
      {
        id: "confLabel",
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          ctx.save();
          ctx.font = '800 1.1rem "Geist", "Manrope", sans-serif';
          ctx.fillStyle = cssVar("--text");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${pct}%`, (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 - 4);
          ctx.font = '600 0.65rem "Geist", "Manrope", sans-serif';
          ctx.fillStyle = cssVar("--text-muted");
          ctx.fillText("confidence", (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2 + 12);
          ctx.restore();
        },
      },
    ],
  });
}

function positionLadderHtml(position, marketPrice) {
  if (!position) {
    return `
      <div class="position-viz position-flat">
        <div class="position-ladder">
          <div class="ladder-track"></div>
          <div class="ladder-marker flat">
            <span class="marker-dot"></span>
            <span class="marker-label">Flat</span>
          </div>
        </div>
        <div class="position-caption">No open position · waiting for next trade</div>
      </div>`;
  }

  const entry = position.entryPrice;
  const current = marketPrice ?? entry;
  const movePct = ((current - entry) / entry) * 100;
  const displayMove = Math.max(-25, Math.min(25, movePct));
  const entryLeft = 50;
  const currentLeft = Math.max(8, Math.min(92, entryLeft + displayMove * 1.6));
  const overlapped = Math.abs(currentLeft - entryLeft) < 4;
  const sideCls = position.side === "long" ? "long" : "short";
  const unrealized =
    position.side === "long"
      ? position.notionalUsdt * ((current - entry) / entry)
      : position.notionalUsdt * ((entry - current) / entry);
  const pnlCls = unrealized >= 0 ? "pnl-pos" : "pnl-neg";
  const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const markers = overlapped
    ? `
        <div class="ladder-marker combined ${sideCls}" style="left:${entryLeft}%">
          <span class="marker-dot"></span>
          <span class="marker-label">Entry & now $${fmt(entry)}</span>
        </div>`
    : `
        <div class="ladder-marker entry" style="left:${entryLeft}%">
          <span class="marker-dot"></span>
          <span class="marker-label">Entry $${fmt(entry)}</span>
        </div>
        <div class="ladder-marker current ${pnlCls}" style="left:${currentLeft}%">
          <span class="marker-dot"></span>
          <span class="marker-label">Now $${fmt(current)}</span>
        </div>`;

  return `
    <div class="position-viz position-open ${sideCls}">
      <div class="position-ladder">
        <div class="ladder-track ${sideCls}"></div>
        ${markers}
      </div>
      <div class="position-caption">
        <span class="position-side ${sideCls}">${position.side.toUpperCase()}</span>
        · $${position.notionalUsdt.toFixed(0)} notional
        · <span class="${pnlCls}">${unrealized >= 0 ? "+" : ""}$${unrealized.toFixed(2)} open PnL</span>
      </div>
    </div>`;
}

function baseChartOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { family: '"Geist", "Manrope", sans-serif', weight: "600" } },
      },
      y: {
        grid: { color: c.grid },
        ticks: { color: c.text, font: { family: '"Geist", "Manrope", sans-serif', weight: "600" } },
      },
    },
  };
}

function renderCharts(portfolio, cycles, latest) {
  if (typeof Chart === "undefined") return;

  destroyCharts();
  const c = chartTheme();
  Chart.defaults.font.family = '"Geist", "Manrope", system-ui, sans-serif';
  Chart.defaults.color = c.text;

  const equityData = portfolio?.equityCurve?.length
    ? portfolio.equityCurve
    : [{ ts: new Date().toISOString(), equity: portfolio?.equity ?? 1000 }];

  const equityCtx = document.getElementById("equityChart")?.getContext("2d");
  if (equityCtx) {
    charts.equity = new Chart(equityCtx, {
      type: "line",
      data: {
        labels: equityData.map((p) =>
          new Date(p.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        ),
        datasets: [
          {
            label: "Equity",
            data: equityData.map((p) => p.equity),
            borderColor: c.accent,
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            fill: true,
            tension: 0.4,
            pointRadius: equityData.length > 14 ? 0 : 4,
            borderWidth: 2.5,
          },
        ],
      },
      options: baseChartOptions(c),
    });
  }

  const recent = [...(cycles ?? [])].slice(0, 8).reverse();
  const activityCtx = document.getElementById("activityChart")?.getContext("2d");
  if (activityCtx) {
    charts.activity = new Chart(activityCtx, {
      type: "bar",
      data: {
        labels: recent.length
          ? recent.map((_, i) => `Run ${i + 1}`)
          : ["No data"],
        datasets: [
          {
            label: "Confidence %",
            data: recent.length
              ? recent.map((cy) => {
                  const d = cy.riskVerdict?.adjustedDecision ?? cy.rawDecision;
                  return Math.round((d.confidence ?? 0) * 100);
                })
              : [0],
            backgroundColor: recent.length
              ? recent.map((cy) => {
                  const a = (cy.riskVerdict?.adjustedDecision ?? cy.rawDecision).action;
                  if (a === "long") return c.green;
                  if (a === "short") return c.red;
                  return c.purple;
                })
              : [c.grid],
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: baseChartOptions(c),
    });
  }

  const channels = latest?.tribunal?.channels ?? [];
  const signalsCtx = document.getElementById("signalsChart")?.getContext("2d");
  if (signalsCtx) {
    const labels = channels.length
      ? channels.map((ch) => ch.name)
      : ["Technical", "Funding", "News", "On-chain"];
    const scores = channels.length ? channels.map((ch) => ch.score) : [0, 0, 0, 0];

    charts.signals = new Chart(signalsCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Score",
            data: scores,
            backgroundColor: channels.length
              ? channels.map((ch) => {
                  if (ch.vote === "bullish") return c.green;
                  if (ch.vote === "bearish") return c.red;
                  return c.cyan;
                })
              : [c.cyan, c.cyan, c.cyan, c.cyan],
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...baseChartOptions(c),
        indexAxis: "y",
        scales: {
          x: {
            min: -1,
            max: 1,
            grid: { color: c.grid },
            ticks: { color: c.text, font: { weight: "700" } },
          },
          y: {
            grid: { display: false },
            ticks: { color: c.text, font: { weight: "800", size: 13 } },
          },
        },
      },
    });
  }
}

function renderSignalsCard(tribunal, regime) {
  if (!els.signalsBody) return;
  if (!tribunal?.channels?.length) {
    els.signalsBody.innerHTML = `
      <div class="stat-value vote-neutral">--</div>
      <div class="stat-meta">Run a cycle to populate signals</div>`;
    return;
  }

  const votes = tribunal.channels.map((c) => c.vote);
  const bull = votes.filter((v) => v === "bullish").length;
  const bear = votes.filter((v) => v === "bearish").length;
  const neut = votes.filter((v) => v === "neutral").length;
  const total = votes.length;

  els.signalsBody.innerHTML = `
    <div class="stat-value ${voteClass(tribunal.consensus)}">${tribunal.consensus.toUpperCase()}</div>
    <div class="stat-meta">${(tribunal.alignment * 100).toFixed(0)}% alignment · ${regime?.regime?.replace(/_/g, " ") ?? "unknown"} market</div>
    <div class="stacked-bar">
      <span class="bar-bull" style="width:${(bull / total) * 100}%"></span>
      <span class="bar-neutral" style="width:${(neut / total) * 100}%"></span>
      <span class="bar-bear" style="width:${(bear / total) * 100}%"></span>
    </div>
    <div class="signal-list">
      ${tribunal.channels
        .map(
          (c) => `
        <div class="signal-row">
          <span class="name">${c.name}</span>
          <span class="vote ${voteClass(c.vote)}">${c.vote}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderDecisionCard(decision, execution, tribunal, maxNotionalUsdt = 100) {
  const labels = { long: "LONG", short: "SHORT", hold: "HOLD", close: "CLOSE" };
  const action = decision?.action ?? "hold";
  const notional = decision?.notionalUsdt ?? 0;
  const leverage = decision?.leverage ?? 1;
  const sl = decision?.stopLossPct;
  const tp = decision?.takeProfitPct;
  const alignment = tribunal?.alignment != null ? `${(tribunal.alignment * 100).toFixed(0)}% signal alignment` : "Run a cycle";
  const status = execution?.status ?? "pending";

  els.decisionBody.innerHTML = `
    <div class="decision-dashboard">
      <div class="decision-hero ${actionClass(action)}">
        <div class="decision-action">${labels[action] ?? action.toUpperCase()}</div>
        <div class="decision-conf-wrap">
          <canvas id="decisionConfChart" aria-label="Confidence chart"></canvas>
        </div>
      </div>
      <div class="decision-metrics">
        <div class="decision-metric">
          <span>Size</span>
          <strong>$${notional.toFixed(0)}</strong>
        </div>
        <div class="decision-metric">
          <span>Leverage</span>
          <strong>${leverage}x</strong>
        </div>
        <div class="decision-metric">
          <span>Stop loss</span>
          <strong>${sl != null ? `${sl}%` : "—"}</strong>
        </div>
        <div class="decision-metric">
          <span>Take profit</span>
          <strong>${tp != null ? `${tp}%` : "—"}</strong>
        </div>
      </div>
      <div class="decision-bar-wrap">
        <div class="decision-bar-label">
          <span>Position size</span>
          <span>$${notional.toFixed(0)} / $${maxNotionalUsdt} max</span>
        </div>
        <div class="decision-bar">
          <span class="decision-bar-fill ${actionClass(action)}" style="width:${maxNotionalUsdt ? Math.min(100, (notional / maxNotionalUsdt) * 100) : 0}%"></span>
        </div>
      </div>
      <div class="decision-foot">
        <span class="decision-status ${status === "simulated" || status === "executed" ? "ok" : ""}">${status}</span>
        <span class="decision-align">${alignment}</span>
      </div>
    </div>`;

  renderDecisionConfidence(decision ?? { action: "hold", confidence: 0 });
}

function renderPortfolioCard(portfolio, marketPrice) {
  const p = portfolio ?? {
    startingEquity: 1000,
    equity: 1000,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalTrades: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    openPosition: null,
    equityCurve: [{ ts: new Date().toISOString(), equity: 1000 }],
  };

  const pnl = p.realizedPnl + p.unrealizedPnl;
  const pnlPct = ((p.equity - p.startingEquity) / p.startingEquity) * 100;
  const pnlCls = pnl >= 0 ? "pnl-pos" : "pnl-neg";
  const winPct = (p.winRate * 100).toFixed(0);

  els.portfolioBody.innerHTML = `
    <div class="wallet-dashboard">
      <div class="wallet-head">
        <div>
          <div class="wallet-label">Account size</div>
          <div class="wallet-equity">$${p.equity.toFixed(2)}</div>
        </div>
        <div class="wallet-pnl-block ${pnlCls}">
          <div class="wallet-label">Total PnL</div>
          <div class="wallet-pnl-pct">${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%</div>
          <div class="wallet-pnl-abs">${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}</div>
        </div>
      </div>
      <div class="wallet-spark-wrap">
        <canvas id="walletSparkChart" aria-label="Equity sparkline"></canvas>
      </div>
      <div class="wallet-stats-grid">
        <div class="wallet-stat">
          <span>Trades</span>
          <strong>${p.totalTrades}</strong>
        </div>
        <div class="wallet-stat">
          <span>Win rate</span>
          <strong>${p.totalTrades ? `${winPct}%` : "—"}</strong>
        </div>
        <div class="wallet-stat">
          <span>W / L</span>
          <strong>${p.wins} / ${p.losses}</strong>
        </div>
        <div class="wallet-stat">
          <span>Started</span>
          <strong>$${p.startingEquity.toFixed(0)}</strong>
        </div>
      </div>
      ${positionLadderHtml(p.openPosition, marketPrice)}
    </div>`;

  renderWalletSparkline(p);
}

function renderTribunal(tribunal) {
  if (els.tribunal) els.tribunal.innerHTML = "";
  if (els.weightBars) els.weightBars.innerHTML = "";
  if (!tribunal) {
    if (els.profileMeta) els.profileMeta.textContent = "Run a cycle to see channel weights";
    if (els.tribunal) els.tribunal.innerHTML = '<p class="stat-meta">Run a cycle first.</p>';
    return;
  }

  const profile = tribunal.profile ?? profiles.find((p) => p.id === activeProfileId);
  if (profile && els.profileMeta) {
    els.profileMeta.textContent = `${profile.name} profile · ${profile.description}`;
  }

  const weights = tribunal.effectiveWeights ?? profile?.weights;
  if (weights && els.weightBars) {
    for (const [key, val] of Object.entries(weights)) {
      const pill = document.createElement("span");
      pill.className = "weight-pill";
      pill.textContent = `${key} x${Number(val).toFixed(2)}`;
      els.weightBars.appendChild(pill);
    }
  }

  if (!els.tribunal) return;
  const wrap = document.createElement("div");
  wrap.className = "channels";
  for (const ch of tribunal.channels ?? []) {
    const card = document.createElement("div");
    card.className = "channel-card";
    card.innerHTML = `
      <div>
        <div class="channel-name">${ch.name} <span class="${voteClass(ch.vote)}">${ch.vote}</span></div>
        <div class="channel-detail">${ch.detail}</div>
      </div>
      <div class="channel-score ${voteClass(ch.vote)}">${ch.score > 0 ? "+" : ""}${ch.score}</div>`;
    wrap.appendChild(card);
  }
  els.tribunal.appendChild(wrap);

  if (tribunal.conflictNote) {
    const note = document.createElement("p");
    note.className = "stat-meta";
    note.style.marginTop = "12px";
    note.textContent = tribunal.conflictNote;
    els.tribunal.appendChild(note);
  }
}

function renderVerdictBar(latest, portfolio, symbol) {
  if (!els.verdictBar) return;
  const decision = latest?.riskVerdict?.adjustedDecision ?? latest?.rawDecision;
  const action = decision?.action ?? "hold";
  const conf = decision?.confidence;
  const labels = { long: "LONG", short: "SHORT", hold: "HOLD", close: "CLOSE" };
  const resolvedSymbol = symbol ?? latest?.symbol ?? lastChartData?.symbol ?? els.settingSymbol?.value ?? "BTCUSDT";

  els.verdictBar.dataset.action = action;
  els.verdictBarAction.textContent = labels[action] ?? action.toUpperCase();
  els.verdictBarSymbol.textContent = resolvedSymbol;
  els.verdictBarConf.textContent = conf != null ? `${(conf * 100).toFixed(0)}%` : "—";

  const equity = portfolio?.equity ?? portfolio?.startingEquity ?? 1000;
  const start = portfolio?.startingEquity ?? 1000;
  const pnlPct = ((equity - start) / start) * 100;
  els.verdictBarEquity.textContent = `$${equity.toFixed(2)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`;
  els.verdictBarEquity.className = pnlPct >= 0 ? "pnl-pos" : "pnl-neg";

  els.verdictBarCycles.textContent = String(portfolio?.totalTrades ?? 0);
  els.verdictBarWinRate.textContent = portfolio?.totalTrades
    ? `${(portfolio.winRate * 100).toFixed(0)}%`
    : "—";
  els.verdictBarLast.textContent = latest?.completedAt ? formatTime(latest.completedAt) : "—";

  renderWhyTrade(decision, latest?.tribunal);
}

function renderWhyTrade(decision, tribunal) {
  if (!els.verdictBarSignals) return;
  const signals = Array.isArray(decision?.signals) ? decision.signals.filter(Boolean) : [];
  const channels = tribunal?.channels ?? [];

  if (!signals.length && !channels.length) {
    els.verdictBarSignals.hidden = true;
    els.verdictBarSignals.innerHTML = "";
    return;
  }

  const channelChips = channels
    .map((c) => `<span class="why-chip vote-${c.vote}">${c.name}: ${c.vote}</span>`)
    .join("");
  const tagChips = signals
    .slice(0, 6)
    .map((s) => `<span class="why-chip why-chip-tag">${String(s).replace(/_/g, " ")}</span>`)
    .join("");

  els.verdictBarSignals.hidden = false;
  els.verdictBarSignals.innerHTML = `
    <span class="why-label">Why:</span>
    ${channelChips}${tagChips}`;
}

function renderTribunalHero(tribunal, decision, execution) {
  if (!els.heroChannels) return;

  const channelsList = TRIBUNAL_JURORS.map((juror) => {
    const channel = tribunal?.channels?.find((c) => c.key === juror.key);
    const vote = channel?.vote ?? "neutral";
    const score = channel?.score;
    const weight = channel?.weight;
    const cls = channel ? voteClass(vote) : "hero-channel-empty";
    return `
      <div class="hero-channel ${cls}">
        <div class="hero-channel-head">
          <span class="hero-channel-name">${juror.label}</span>
          <span class="hero-channel-weight">${weight != null ? `x${weight.toFixed(2)}` : "—"}</span>
        </div>
        <div class="hero-channel-vote ${channel ? voteClass(vote) : ""}">${channel ? vote : "waiting"}</div>
        <div class="hero-channel-score">${score != null ? (score > 0 ? "+" : "") + score : "·"}</div>
        <div class="hero-channel-detail">${channel?.detail ?? hintForChannel(juror.key)}</div>
      </div>`;
  }).join("");

  els.heroChannels.innerHTML = channelsList;

  if (els.heroConsensus) {
    const consensus = tribunal?.consensus ?? "neutral";
    const alignment = tribunal?.alignment;
    const conflict = tribunal?.conflict;
    els.heroConsensus.innerHTML = `
      <div class="hero-consensus-vote ${voteClass(consensus)}">${tribunal ? consensus.toUpperCase() : "—"}</div>
      <div class="hero-consensus-meta">
        ${alignment != null ? `${(alignment * 100).toFixed(0)}% alignment` : "No votes yet"}
        ${conflict ? '<span class="hero-conflict-pill">Split jury</span>' : ""}
      </div>`;
  }

  if (els.heroVerdict) {
    const labels = { long: "LONG", short: "SHORT", hold: "HOLD", close: "CLOSE" };
    const action = decision?.action ?? "hold";
    const conf = decision?.confidence;
    const status = execution?.status;
    els.heroVerdict.className = `hero-verdict ${actionClass(action)}`;
    els.heroVerdict.innerHTML = `
      <div class="hero-verdict-action">${labels[action] ?? action.toUpperCase()}</div>
      <div class="hero-verdict-meta">
        ${decision ? `${(conf * 100).toFixed(0)}% confidence` : "Awaiting decision"}
        ${status ? `<span class="hero-status-pill status-${status}">${status}</span>` : ""}
      </div>`;
  }

  if (els.tribunalHeroBadge) {
    if (!tribunal) {
      els.tribunalHeroBadge.textContent = "Idle";
      els.tribunalHeroBadge.className = "tribunal-hero-badge";
    } else if (tribunal.conflict) {
      els.tribunalHeroBadge.textContent = "Split jury";
      els.tribunalHeroBadge.className = "tribunal-hero-badge badge-conflict";
    } else {
      els.tribunalHeroBadge.textContent = `${(tribunal.alignment * 100).toFixed(0)}% aligned`;
      els.tribunalHeroBadge.className = "tribunal-hero-badge badge-aligned";
    }
  }
}

function renderHeroSources() {
  if (!els.heroSources || !meta?.dataSources) return;
  els.heroSources.innerHTML = meta.dataSources
    .map(
      (s) => `
      <span class="hero-source-chip kind-${s.kind}">
        <span class="hero-source-dot"></span>
        <strong>${s.label}</strong>
        <span>${s.provider}</span>
      </span>`
    )
    .join("");
}

function renderLatest(latest, portfolio, maxNotionalUsdt = 100, journalCycles = [], options = {}) {
  if (!latest) {
    renderSignalsCard(null);
    renderDecisionCard(
      { action: "hold", confidence: 0, notionalUsdt: 0, leverage: 1, stopLossPct: null, takeProfitPct: null },
      null,
      null,
      maxNotionalUsdt
    );
    renderPortfolioCard(portfolio, null);
    renderTribunal(null);
    renderTribunalJury(null);
    renderTribunalHero(null, null, null);
    renderVerdictBar(null, portfolio, null);
    setAgentState("idle", "Idle · waiting for cycle");
    void renderAgent(null, null, null, null, [], null);
    return;
  }

  const decision = latest.riskVerdict?.adjustedDecision ?? latest.rawDecision;
  const tribunal = latest.tribunal;
  const regime = latest.perception?.regime;
  const market = latest.perception?.market;

  if (market?.lastPrice) {
    const chg = market.change24hPct;
    const symbolLabel = (latest.symbol ?? "BTC").replace("USDT", "");
    els.livePrice.innerHTML = `
      <span class="dot"></span>
      <span>Live ${symbolLabel} <strong>$${market.lastPrice.toLocaleString()}</strong></span>
      <span class="${chg >= 0 ? "pnl-pos" : "pnl-neg"}">${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% 24h</span>
      <span class="stat-meta" style="margin:0">Bitget</span>`;
  }

  renderSignalsCard(tribunal, regime);
  renderDecisionCard(decision, latest.execution, tribunal, maxNotionalUsdt);
  renderPortfolioCard(portfolio, market?.lastPrice ?? null);
  renderTribunalHero(tribunal, decision, latest.execution);
  renderVerdictBar(latest, portfolio, latest.symbol);

  if (tribunal) {
    els.conflictBadge.style.display = tribunal.conflict ? "inline-flex" : "none";
    renderTribunal(tribunal);
  }

  renderAgent(decision, latest.execution, decision.reasoning, latest.agentContext, journalCycles, tribunal, options);
  renderTribunalJury(tribunal);
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function phaseLabel(phase) {
  const map = {
    idle: "Idle",
    running: "Running cycle",
    waiting: "Waiting",
    stopped: "Stopped",
  };
  return map[phase] ?? phase;
}

function renderAutopilot(autopilot) {
  if (!autopilot) return;

  const running = autopilot.running;
  els.autopilotBadge.textContent = running ? "Running" : "Stopped";
  els.autopilotBadge.className = `badge ${running ? "badge-running" : "badge-off"}`;
  els.autopilotPhase.textContent = phaseLabel(autopilot.phase);
  els.autopilotCycles.textContent = String(autopilot.cyclesCompleted ?? 0);
  els.autopilotNext.textContent = running && autopilot.nextCycleAt ? formatTime(autopilot.nextCycleAt) : "—";
  els.autopilotLast.textContent = autopilot.lastCycleAt ? formatTime(autopilot.lastCycleAt) : "—";

  els.autopilotStartBtn.disabled = running;
  els.autopilotStopBtn.disabled = !running;
  els.runBtn.disabled = running;
  els.saveSettingsBtn.disabled = running;
  els.settingsForm.querySelectorAll("input").forEach((input) => {
    input.disabled = running;
  });

  els.autopilotLog.innerHTML = "";
  const log = autopilot.log ?? [];
  if (!log.length) {
    els.autopilotLog.innerHTML = '<p class="stat-meta" style="padding:12px 14px">No activity yet.</p>';
    return;
  }
  for (const entry of log.slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "log-row";
    row.innerHTML = `
      <span class="log-time">${formatTime(entry.ts)}</span>
      <span class="log-${entry.level}">${entry.message}</span>`;
    els.autopilotLog.appendChild(row);
  }

  if (running && autopilot.phase === "running") {
    setAgentState("thinking", "Autopilot · running cycle");
  } else if (running) {
    setAgentState("ready", "Autopilot · online");
  }

  if (running && !pollTimer) {
    pollTimer = setInterval(() => refresh({ quiet: true }), 4000);
  }
  if (!running && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function fillSettingsForm(settings, hint) {
  if (!settings) return;
  els.settingSymbol.value = settings.symbol;
  els.settingInterval.value = String(Math.round(settings.intervalMs / 60_000));
  els.settingNotional.value = String(settings.maxNotionalUsdt);
  els.settingLeverage.value = String(settings.maxLeverage);
  els.settingDryRun.checked = settings.dryRun;
  if (hint) {
    els.settingsHint.textContent = hasBitgetAuth
      ? "Bitget API keys detected in server .env. You can disable dry run for live orders."
      : "API keys for live trading stay in server .env only. Dry run is recommended for the hackathon.";
  }
}

async function loadSettings() {
  const data = await fetchJson("/api/settings");
  hasBitgetAuth = data.hasBitgetAuth ?? false;
  fillSettingsForm(data.settings, true);
  return data.settings;
}

function formatCycleTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderJournal(cycles) {
  if (els.journalCount) {
    els.journalCount.textContent = `${cycles?.length ?? 0} runs`;
  }

  els.journal.innerHTML = "";
  if (!cycles?.length) {
    els.journal.innerHTML = '<p class="stat-meta">No cycles logged yet. Run a cycle or start autopilot.</p>';
    return;
  }

  for (const cycle of cycles.slice(0, 25)) {
    const d = cycle.riskVerdict?.adjustedDecision ?? cycle.rawDecision;
    const price = cycle.perception?.market?.lastPrice;
    const equity = cycle.portfolio?.equity;
    const ctx = cycle.agentContext;
    const failed = cycle.execution?.status === "failed";

    const row = document.createElement("details");
    row.className = `journal-entry${failed ? " journal-entry-error" : ""}`;
    row.innerHTML = `
      <summary class="journal-summary">
        <div class="journal-left">
          <span class="status-pill ${statusClass(d.action)}">${d.action}</span>
          <span class="journal-symbol">${cycle.symbol}</span>
          ${price != null ? `<span class="journal-price">$${price.toLocaleString()}</span>` : ""}
        </div>
        <div class="journal-meta">
          <span class="journal-status">${cycle.execution?.status ?? "—"}</span>
          ${equity != null ? `<span class="journal-equity">$${equity.toFixed(2)}</span>` : ""}
          <span class="journal-time">${formatCycleTime(cycle.completedAt)}</span>
        </div>
      </summary>
      <div class="journal-detail">
        <div class="journal-detail-grid">
          <div><span>Confidence</span><strong>${((d.confidence ?? 0) * 100).toFixed(0)}%</strong></div>
          <div><span>Notional</span><strong>$${(d.notionalUsdt ?? 0).toFixed(0)}</strong></div>
          <div><span>Leverage</span><strong>${d.leverage ?? 1}x</strong></div>
          <div><span>Consensus</span><strong>${cycle.tribunal?.consensus ?? "—"}</strong></div>
        </div>
        ${ctx?.plan ? `<p class="journal-line"><strong>Plan:</strong> ${ctx.plan}</p>` : d.plan ? `<p class="journal-line"><strong>Plan:</strong> ${d.plan}</p>` : ""}
        ${d.reasoning ? `<p class="journal-line"><strong>Reasoning:</strong> ${d.reasoning}</p>` : ""}
        ${ctx?.reflection ? `<p class="journal-line"><strong>Reflection:</strong> ${ctx.reflection}</p>` : ""}
        ${ctx?.nextFocus ? `<p class="journal-line"><strong>Next focus:</strong> ${ctx.nextFocus}</p>` : ""}
        ${cycle.execution?.message ? `<p class="journal-line journal-muted">${cycle.execution.message}</p>` : ""}
        <p class="journal-id">ID ${cycle.id}</p>
      </div>`;
    els.journal.appendChild(row);
  }
}

async function loadJournal(limit = 50) {
  const journal = await fetchJson(`/api/journal?limit=${limit}`);
  renderJournal(journal.cycles ?? []);
  return journal.cycles ?? [];
}

function startCycleAnimation() {
  let step = 0;
  els.overlay.classList.add("open");
  setAgentState("thinking", "Reasoning · memory + tribunal + plan");
  setAgentSteps("memory");
  setDeliberating(false);
  renderTribunalJury(null, { deliberating: true, activeIndex: 0 });
  if (els.reasoningText) {
    els.reasoningText.textContent =
      "Qwen is reading market data, tribunal votes, and news. This usually takes 30 to 50 seconds...";
  }
  renderPipeline(0);

  const advance = () => {
    if (step >= CYCLE_STEPS.length) return;
    const s = CYCLE_STEPS[step];
    els.overlayStep.textContent = s.label;
    els.overlayHint.textContent = s.hint;
    els.progressFill.style.width = `${s.pct}%`;
    renderPipeline(step);
    setAgentSteps(s.agentStep);

    if (s.agentStep === "tribunal") {
      startJuryDeliberation();
      setDeliberating(false);
    } else if (s.agentStep === "plan") {
      stopJuryAnimation();
      setDeliberating(true);
    }

    step += 1;
    if (step < CYCLE_STEPS.length) {
      const delay = step === 5 ? 22000 : step === 4 ? 18000 : 3500;
      cycleTimer = setTimeout(advance, delay);
    }
  };
  advance();
}

function stopCycleAnimation() {
  if (cycleTimer) clearTimeout(cycleTimer);
  cycleTimer = null;
  stopJuryAnimation();
  setDeliberating(false);
  els.overlay.classList.remove("open");
  els.progressFill.style.width = "0%";
  renderPipeline(-1, true);
  setTimeout(() => renderPipeline(-1, false), 1500);
}

async function refresh(options = {}) {
  if (!options.quiet) clearError();
  const [status, journal] = await Promise.all([
    fetchJson("/api/status"),
    fetchJson("/api/journal?limit=50"),
  ]);

  profiles = status.profiles ?? [];
  activeProfileId = status.activeProfileId ?? "balanced";
  renderProfiles();

  els.modeBadge.textContent = status.dryRun ? "Dry run" : "Live";
  els.modeBadge.className = `badge ${status.dryRun ? "badge-dry" : "badge-live"}`;

  renderAutopilot(status.autopilot);
  renderLatest(status.latest, status.portfolio, status.maxNotionalUsdt ?? 100, journal.cycles ?? [], options);
  renderJournal(journal.cycles ?? []);

  lastChartData = {
    portfolio: status.portfolio,
    cycles: journal.cycles ?? [],
    latest: status.latest,
    maxNotionalUsdt: status.maxNotionalUsdt ?? 100,
  };
  renderCharts(lastChartData.portfolio, lastChartData.cycles, lastChartData.latest);
}

async function init() {
  setTheme(getTheme());
  showFirstLoadHint();
  renderPipeline();
  renderEmptyDashboard();

  try {
    meta = await fetchJson("/api/meta");
    if (meta.llm?.model) els.agentModel.textContent = meta.llm.model;
    renderPipeline();
    renderSources();
    renderHeroSources();
  } catch {
    renderSources();
    renderHeroSources();
  }

  try {
    await loadSettings();
    await refresh();
    await maybeAutoRunFirstCycle();
  } catch (err) {
    showError(err.message || "Could not load dashboard. Run pnpm api first.");
    renderEmptyDashboard();
  }
}

async function maybeAutoRunFirstCycle() {
  try {
    const status = await fetchJson("/api/status");
    if (status.autopilot?.running) return;
    if (sessionStorage.getItem("vector_autorun")) return;
    if (lastChartData.latest) {
      const last = new Date(lastChartData.latest.completedAt).getTime();
      const ageMs = Date.now() - last;
      if (ageMs < 30 * 60 * 1000) return;
    }
    sessionStorage.setItem("vector_autorun", "1");
    await triggerCycle();
  } catch {
    // silent — auto-run is a nice-to-have
  }
}

async function triggerCycle() {
  if (els.runBtn?.disabled) return;
  if (els.runBtn) els.runBtn.disabled = true;
  clearError();
  startCycleAnimation();
  try {
    await fetchJson("/api/cycle", { method: "POST" });
    stopCycleAnimation();
    await refresh();
  } catch (err) {
    stopCycleAnimation();
    showError(err.message || "Cycle failed. Turn VPN on if Bitget is blocked.");
  } finally {
    try {
      const ap = await fetchJson("/api/autopilot");
      if (els.runBtn) els.runBtn.disabled = ap.running;
    } catch {
      if (els.runBtn) els.runBtn.disabled = false;
    }
  }
}

els.profileSelect.addEventListener("change", async () => {
  const id = els.profileSelect.value;
  clearError();
  try {
    await fetchJson(`/api/profiles/${id}`, { method: "POST" });
    activeProfileId = id;
    await refresh();
  } catch (err) {
    showError(err.message || "Failed to switch profile");
  }
});

els.runBtn.addEventListener("click", () => triggerCycle());
els.dismissHint?.addEventListener("click", dismissFirstLoadHint);

els.autopilotStartBtn.addEventListener("click", async () => {
  clearError();
  els.autopilotStartBtn.disabled = true;
  try {
    await fetchJson("/api/autopilot/start", { method: "POST" });
    await refresh();
  } catch (err) {
    showError(err.message || "Could not start autopilot");
    els.autopilotStartBtn.disabled = false;
  }
});

els.autopilotStopBtn.addEventListener("click", async () => {
  clearError();
  els.autopilotStopBtn.disabled = true;
  try {
    await fetchJson("/api/autopilot/stop", { method: "POST" });
    await refresh();
  } catch (err) {
    showError(err.message || "Could not stop autopilot");
  } finally {
    els.autopilotStopBtn.disabled = false;
  }
});

els.settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  els.saveSettingsBtn.disabled = true;
  try {
    const body = {
      symbol: els.settingSymbol.value,
      intervalMs: Number(els.settingInterval.value) * 60_000,
      maxNotionalUsdt: Number(els.settingNotional.value),
      maxLeverage: Number(els.settingLeverage.value),
      dryRun: els.settingDryRun.checked,
    };
    const data = await fetchJson("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fillSettingsForm(data.settings);
    await refresh();
  } catch (err) {
    showError(err.message || "Could not save settings");
  } finally {
    els.saveSettingsBtn.disabled = false;
  }
});

els.startBtn.addEventListener("click", closeWelcome);
els.skipWelcome.addEventListener("click", closeWelcome);
els.helpBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  showWelcome();
});
els.navSignals.addEventListener("click", () => scrollTo("cardSignals"));
els.navAutopilot.addEventListener("click", () => scrollTo("autopilotSection"));
els.navAgent.addEventListener("click", () => scrollTo("agentPanel"));
els.navJournal.addEventListener("click", () => scrollTo("journalCard"));
els.journalRefreshBtn?.addEventListener("click", async () => {
  clearError();
  try {
    const cycles = await loadJournal(50);
    lastChartData.cycles = cycles;
    renderCharts(lastChartData.portfolio, cycles, lastChartData.latest);
  } catch (err) {
    showError(err.message || "Could not refresh cycle log");
  }
});
els.navSettings.addEventListener("click", () => scrollTo("settingsSection"));
els.themeBtn.addEventListener("click", toggleTheme);
els.menuBtn.addEventListener("click", openSidebar);
els.speakTranscriptBtn?.addEventListener("click", speakTranscript);
els.sidebarBackdrop.addEventListener("click", closeSidebar);

init();
