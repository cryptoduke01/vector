# Vector — Bitget AI Hackathon S1 submission pack

**Submit:** https://forms.gle/CEGB6fRtuobD3bCj8  
**Deadline:** June 25, 2026 24:00 (UTC+8)  
**Track:** Trading Agent  
**Prizes in play:** Grand Prize $6,600 USDT · Participation +$50 USDT (demo + qualifying post)

---

## Status right now

| Requirement | Status | Action |
|-------------|--------|--------|
| Public GitHub repo | Done | https://github.com/cryptoduke01/vector |
| README with run instructions | Done | `pnpm api` in README |
| Working agent loop | Done | perceive → tribunal → Qwen → risk → execute → journal |
| Paper trading log (required) | Ready locally | Export + push `submissions/paper-trading-log.json` |
| **Public demo URL** | **Not live yet** | Deploy Render Blueprint today |
| Bitget UID matches registration | You verify | Same UID on form |
| Four-part project description | Below | Copy into form |
| Demo video (optional, recommended) | Script below | Record after Render is live |
| Community post (+$50) | Not done | Repost Bitget tweet + `#BitgetHackathon` |

**Baseline disqualifiers (avoid these):**
- Demo link requires login → must add video
- No verifiable usage record → submit paper log link
- Pure feature list, no thesis → use four-part description below
- UID mismatch → use registration UID

---

## Do these 4 things today (in order)

### 1. Deploy to Render (~20 min)

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect `cryptoduke01/vector`
3. Set secrets:
   - `LLM_API_KEY` — hackathon Qwen key
   - `EXA_API_KEY` — your Exa key
4. Deploy → copy URL (e.g. `https://vector-demo.onrender.com`)
5. Open URL → run **2 cycles** on the live site (cold start can be slow on free tier)

### 2. Export and push trade log (~5 min)

```bash
cd vector
node scripts/export-trade-log.mjs
git add submissions/paper-trading-log.json scripts/export-trade-log.mjs
git commit -m "Add hackathon paper trading log export"
git push
```

**Submit this link on the form:**  
`https://github.com/cryptoduke01/vector/blob/main/submissions/paper-trading-log.json`

Judges also see cycles in the dashboard **Recent cycles** card when they open your demo URL.

### 3. Submit the form

| Field | What to paste |
|-------|----------------|
| Track | Trading Agent |
| Bitget UID | Your registration UID |
| GitHub | https://github.com/cryptoduke01/vector |
| Demo URL | Your Render URL |
| Paper trading log | GitHub link above (+ demo URL journal) |
| Description | Four-part text below |
| Demo video | YouTube/Loom link (after recording) |
| Community post | Link to your `#BitgetHackathon` tweet |

### 4. Community post (+$50 USDT)

1. Find Bitget's official hackathon interaction post
2. **Quote-repost** it
3. Add `#BitgetHackathon` and `@Bitget_AI`
4. One line + demo link, e.g.:

> Built Vector for #BitgetHackathon — 4 signals vote before Qwen trades. Paper PnL, full audit log, dry-run only. Try it: [your Render URL] @Bitget_AI

Submit the tweet URL on the form.

---

## Four-part project description (paste into form)

### Part 1 — Problem

Most AI trading bots collapse everything into one LLM guess. When technicals say buy, funding says sell, and news is neutral, there is no structure — just a black box and a prayer.

### Part 2 — Thesis / core logic

Vector runs a **Signal Tribunal** before any trade. Four independent channels — technical, funding, news, and Solana on-chain — each vote bullish, bearish, or neutral. Qwen's job is to **reconcile the jury**, not invent a signal from scratch. When channels conflict, Vector cuts size or holds. A regime classifier (trend / range / volatile) adjusts channel weights. Hard risk guards cap notional, leverage, and require stop-loss logic before execution.

### Part 3 — What we built

End-to-end autonomous loop on Bitget USDT perpetuals via `bitget-core`:

**Perceive** (Bitget market + Exa news + DexScreener) → **Tribunal** (weighted votes) → **Qwen decide** (hackathon API) → **Risk guard** → **Execute** (dry-run sim or live) → **Journal** (audit trail + paper wallet).

Public dashboard: live signals, AI decision, paper PnL chart, position view, autopilot mode, and cycle history. 26+ paper cycles logged with timestamp, pair, direction, price, notional, and balance change.

**Bitget stack:** Agent Hub / bitget-core, hackathon Qwen (`qwen3.6-flash`), sim trading per official rules.

### Part 4 — Your take on AI trading (optional)

Agents should not replace risk management — they should make disagreement visible. The tribunal layer is the product: humans and judges can see *why* a trade happened, not just *what* happened.

---

## How judges score you (Trading Agent track)

| Dimension | How Vector hits it |
|-----------|-------------------|
| **Depth of thesis** | Tribunal + conflict sizing — not one-shot LLM |
| **Runnability** | Public demo + GitHub README + paper log |
| **Completeness** | Full perceive-decide-execute-journal loop |
| **Novelty** | Four-channel jury before Qwen; regime-aware weights |

Paper trading **beats** backtest-only. You have both a live demo and a JSON log.

---

## Demo video script (~2:45, under 3 min)

**Record after Render is live.** 1080p, clean browser, hide bookmarks, light theme looks good on video.

### 0:00–0:15 — Hook

> "Most AI trading bots are a black box — one model, one guess, no explanation. Vector is different: four signals vote first, then Qwen decides."

### 0:15–0:30 — Open demo

- Open your **Render URL**
- Pan: Signals · AI decision · Paper wallet cards at top
- Say: "Dry run only — paper wallet, real Bitget prices, no real money."

### 0:30–1:15 — Run one cycle

- Click **Run cycle**
- While loading: "It pulls live BTC from Bitget, news from Exa, Solana DEX data, runs the tribunal, then Qwen reasons for about 30 seconds."
- When done: point at **Active signals** (four votes)
- Point at **AI decision** (LONG/SHORT/HOLD + confidence)
- Point at **Paper wallet** (equity, PnL%, position bar)

### 1:15–1:45 — Agent reasoning

- Scroll to **Vector Agent** panel
- Read one sentence of Qwen reasoning aloud: "Notice it says which channels it followed or overrode."
- Scroll to **Signal tribunal** — channel cards + weights

### 1:45–2:15 — Proof it ran before

- **Recent cycles** — "Every run is logged with timestamp and action."
- **Portfolio equity chart** — "Paper PnL over time."
- Optional: show GitHub `submissions/paper-trading-log.json` — "Judges can verify the full log."

### 2:15–2:45 — Close

> "Vector — Signal Tribunal trading agent for Bitget. Four votes, one explainable decision, full audit trail. Built for Bitget AI Hackathon S1. Link in description."

**Upload:** YouTube (unlisted or public) or Loom. Add link to submission form.

---

## 30-second pitch (memorize)

> Vector is an AI trading agent for Bitget. Four independent signals vote first — price, funding, news, and on-chain data. Qwen reads the votes, explains conflicts, then decides long, short, or hold. Risk caps and a paper wallet track every cycle. Dry run only — no real capital.

---

## Grand prize checklist (honest)

To compete for **$6,600** you need to be best **across all tracks**, not just Trading Agent. Your strengths:

- Real runnable demo (many teams won't have this)
- Clear thesis (tribunal ≠ generic bot)
- Verifiable paper log (26 cycles)
- Bitget + Qwen integration

Your gaps to close **today**:

1. **Live public URL** — non-negotiable
2. **Video** — separates you from text-only submissions
3. **Community post** — free $50 + visibility for Community Impact Award ($500)

---

## Quick links

- Repo: https://github.com/cryptoduke01/vector
- Submit: https://forms.gle/CEGB6fRtuobD3bCj8
- Hackathon docs: https://bitget-ai.gitbook.io/hackathon
- Paper log (after push): https://github.com/cryptoduke01/vector/blob/main/submissions/paper-trading-log.json
