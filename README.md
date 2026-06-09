# Vector

**Signal Tribunal trading agent** for [Bitget AI Hackathon S1](https://www.bitget.com/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a).

Not another black-box bot. Vector runs **4 independent signal channels** that vote before Qwen ever decides — then reconciles conflicts, sizes by regime, and logs paper PnL.

## What makes Vector different

| Generic bot | Vector |
|---|---|
| One LLM guess | **Signal Tribunal** — technical, funding, news, on-chain vote first |
| No conflict handling | **Split jury detection** — halves size or holds when channels disagree |
| Mystery decisions | **Qwen cites which channels it followed or overrode** |
| No proof | **Paper PnL ledger** — equity curve, win rate, sim trade history |

## Loop

1. **Perceive** — Bitget market + Exa news + Solana DEX + regime classifier
2. **Tribunal** — 4 channels vote bullish/bearish/neutral
3. **Decide** — Qwen reconciles tribunal + regime
4. **Guard** — Alignment check, conflict sizing, stop-loss, caps
5. **Execute** — Bitget futures via `bitget-core` (dry-run default)
6. **Journal** — Full audit trail + paper portfolio in `data/`

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm start          # one agent cycle (dry-run)
pnpm api            # demo dashboard on http://localhost:4100
```

### Demo dashboard

Open **http://localhost:4100** — judges can see latest action, reasoning, Solana signal, and audit journal. Click **Run cycle** to trigger live.

### API

- `GET /health`
- `GET /api/status` — latest cycle
- `GET /api/journal` — audit trail
- `POST /api/cycle` — trigger one cycle

## Environment

| Variable | Required | Description |
|---|---|---|
| `BITGET_API_KEY` | Live only | Bitget API key (competition sub-account) |
| `LLM_PROVIDER` | No | `qwen` (default) or `openai` |
| `LLM_API_KEY` | Recommended | DashScope or OpenAI key |
| `LLM_BASE_URL` | No | Hackathon Qwen: `https://hackathon.bitgetops.com/v1` |
| `LLM_MODEL` | No | Default `qwen3.6-plus` (from [official docs](https://bitget-ai.gitbook.io/hackathon)) |
| `EXA_API_KEY` | Recommended | News perception |
| `AGENT_DRY_RUN` | No | Default `true` — set `false` for live trades |

## Hackathon track

**Trading agent** — full perceive/decide/execute loop with explainable reasoning, Solana on-chain signals, and audit journal.

## Related

- [Bitget Agent Hub](https://www.bitget.com/activity-hub/agent-hub)
- [bitget-core](https://www.npmjs.com/package/bitget-core)
