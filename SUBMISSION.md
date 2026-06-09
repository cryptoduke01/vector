# Vector — Hackathon submission checklist

You do **not** need to be a trader. Judges want a working demo + clear story.

## What you already have

- [x] Registered as **Vector**, track **Trading agent**
- [x] Working agent loop (market + news + on-chain → tribunal → Qwen → journal)
- [x] Dashboard at `localhost:4100` with plain-English explainer
- [x] EXA news wired
- [x] Paper wallet (fake $1,000, no real trades)
- [x] `REGISTRATION.md` project description ready to paste

## What's left (in order)

### 1. Build history (~30 min, VPN on)

Run 5–10 cycles so the journal isn't empty:

```bash
pnpm batch 5
```

Or click **Run cycle** on the dashboard a few times.

### 2. Put it online (~20 min)

Judges need a **public URL**, not localhost.

1. Push this repo to GitHub (private is fine)
2. [render.com](https://render.com) → New → Blueprint → connect repo
3. Set env vars in Render dashboard:
   - `LLM_API_KEY` (Qwen hackathon key)
   - `EXA_API_KEY`
4. Deploy → copy URL like `https://vector-demo.onrender.com`

`render.yaml` is already in the repo.

### 3. Record demo video (~15 min, optional but helps)

Screen record **under 3 minutes**:

1. Open public URL
2. Show "What's happening" box
3. Click **Run cycle**, wait for result
4. Point at tribunal votes + Qwen reasoning + journal entry
5. Mention: dry run, Bitget + Qwen hackathon API, Signal Tribunal

Upload to YouTube (unlisted) or Loom.

### 4. Submit (Jun 15–25)

On the hackathon portal:

| Field | Value |
|-------|--------|
| Demo link | Your Render URL |
| Description | Copy from `REGISTRATION.md` |
| Video | YouTube/Loom link (optional) |

### 5. Community post (+50 USDT bonus)

Repost Bitget's official hackathon tweet with:

- `#BitgetHackathon`
- `@Bitget_AI`
- One sentence + your demo link

---

## Your 30-second pitch (memorize this)

> Vector is an AI trading agent for Bitget. Four independent signals vote first — price, funding, news, and on-chain data. Qwen reads the votes, explains any conflicts, then decides to buy, sell, or wait. Everything is logged. It's dry-run only — no real money.

---

## Dates

| Milestone | Date |
|-----------|------|
| Registration closes | Jun 14 |
| Submit window opens | Jun 15 |
| Submit window closes | Jun 25 |
| Hackathon ends | Jun 30 |
