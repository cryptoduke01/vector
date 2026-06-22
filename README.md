# Vector

Autonomous AI trading for Bitget with a four-channel signal jury that votes before the LLM decides.

**Live demo:** https://vector-demo-qzdb.onrender.com

Built for the [Bitget AI Hackathon S1](https://www.bitget.com/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a) in the Trading Agent track.

---

## Why Vector exists

Most AI trading agents collapse the entire decision into a single LLM prompt. When the model is wrong, there is no way to inspect which assumption broke. Vector is structured the way a serious trading desk is structured: several independent analysts argue first, then a senior trader reconciles the argument and is held accountable for the call.

That argument is the **Signal Tribunal**. It runs before Qwen ever sees the data.

## How the tribunal works

Every cycle, four independent channels each cast a vote and produce a numeric score between -1 and +1.

| Channel | What it reads | What it votes on |
| --- | --- | --- |
| Technical | Bitget 24h change and 6-candle momentum on 15m | Trend strength, momentum continuation |
| Funding | Bitget perpetual funding rate | Crowd positioning, mean reversion bias |
| News | Exa search, last 24 hours of headlines | Sentiment lexicon score |
| On-chain | DexScreener Solana DEX activity | Flow, volume regime |

A market regime classifier (trending up, trending down, ranging, volatile) then adjusts how each channel is weighted. Technical gets dialed up in trending regimes, dialed down in chop. The tribunal computes a weighted consensus, an alignment percentage, and a conflict flag when the jury is split.

Only after this happens does Qwen receive the bundle. The system prompt instructs Qwen to **reconcile the tribunal, not invent a fresh signal**. The response must cite which channels were followed and which were overridden. This is what makes every trade explainable.

## How risk is managed

Three deterministic layers in [`src/decide/risk.ts`](src/decide/risk.ts), enforced after the LLM responds:

1. **Conflict sizing.** If the tribunal flagged a split jury, notional is halved and reported confidence is capped at 0.6.
2. **Alignment and confidence gates.** Alignment under 50 percent or confidence under 0.55 forces a HOLD regardless of what the LLM emitted.
3. **Hard caps.** Maximum notional and leverage are environment locked. Every directional trade missing a stop loss has a 2 percent stop injected automatically.

The LLM is the most expressive layer and also the least trustworthy under distribution shift. Constraining it deterministically is the point.

## The autonomous loop

1. **Memory.** Recall the last five cycles before deciding anything.
2. **Perceive.** Bitget market data, Exa news, DexScreener on-chain flow, regime classifier.
3. **Tribunal.** Four channels vote with weights and scores.
4. **Plan and decide.** Qwen states the intent, reconciles the tribunal, returns a structured JSON decision.
5. **Risk guard.** Conflict sizing, alignment gate, hard caps, stop loss injection.
6. **Execute.** Dry run by default, live via `bitget-core` against the V2 mix futures endpoint.
7. **Reflect.** Agent reviews the outcome and sets a focus for the next cycle.
8. **Journal.** Full audit record persisted to `data/journal.json` and the paper portfolio to `data/portfolio.json`.

## Quick start

```bash
cp .env.example .env
pnpm install

pnpm start             # one agent cycle (dry run)
pnpm batch 20 12       # 20 cycles, 12s apart, builds judge-ready journal
pnpm export:log        # export paper trading log to submissions/
pnpm api               # boot the demo dashboard on http://localhost:4100
```

Open [http://localhost:4100](http://localhost:4100) or the [live demo](https://vector-demo-qzdb.onrender.com) and click **Run cycle**. The first cold start on Render takes about 30 seconds, then Qwen reasoning takes another 30 to 50 seconds.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| GET | `/api/meta` | App identity, pipeline steps, data sources |
| GET | `/api/status` | Latest cycle, portfolio, autopilot state, settings |
| GET | `/api/journal?limit=N` | Audit trail of recent cycles |
| POST | `/api/cycle` | Trigger one cycle synchronously |
| POST | `/api/autopilot/start` | Start the loop |
| POST | `/api/autopilot/stop` | Stop the loop |
| PATCH | `/api/settings` | Update symbol, interval, caps, dry-run |

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `LLM_API_KEY` | Recommended | DashScope or OpenAI key. Without it, fallback heuristic decisions are used. |
| `LLM_BASE_URL` | No | Defaults to the hackathon Qwen endpoint `https://hackathon.bitgetops.com/v1` |
| `LLM_MODEL` | No | Defaults to `qwen3.6-plus` per the official hackathon docs |
| `EXA_API_KEY` | Recommended | Powers the News channel. Without it, news votes neutral. |
| `BITGET_API_KEY` | Live only | Required only when disabling dry run |
| `BITGET_SECRET_KEY` | Live only | Same as above |
| `BITGET_PASSPHRASE` | Live only | Same as above |
| `AGENT_DRY_RUN` | No | Defaults to `true`. Set `false` for live orders. |
| `AGENT_MAX_NOTIONAL_USDT` | No | Hard cap on position size. Default 100. |
| `AGENT_MAX_LEVERAGE` | No | Hard cap on leverage. Default 5. |
| `SIGNAL_PROFILE` | No | `balanced`, `momentum`, `contrarian`, or `sol-alpha` |

## Stack

- TypeScript on Node 20, Express, Zod, tsx, dotenv
- Bitget public market data and `bitget-core` for authenticated execution
- Official hackathon Qwen endpoint at `qwen3.6-plus`
- Exa search SDK for news perception
- DexScreener public API for Solana DEX flow
- Vanilla HTML, CSS, and ES modules on the frontend with Chart.js

No framework dependency on the client. No background workers. Everything is one Express process and a JSON file under `data/`.

## What gets logged

Every cycle is persisted to `data/journal.json` and exported on demand to `submissions/paper-trading-log.json` for judges:

- Cycle id, started at, completed at
- Symbol, last price, 24h change, funding rate, regime
- Tribunal channels, votes, scores, weights, conflict flag
- Raw LLM decision and the post-risk-guard adjusted decision
- Execution status, dry-run or live, order id when live
- Paper portfolio snapshot, realized PnL, unrealized PnL, equity, win rate
- Agent context: plan, reflection, next focus

Run `pnpm export:log` after a batch to produce the exact format judges and the hackathon form expect.

## Repository layout

```
src/
  agent/         autonomous loop, memory, reflection, autopilot
  api/           Express server and routes
  config/        environment, settings, signal profiles
  decide/        tribunal, strategist prompt, risk guards
  execute/       Bitget order placement
  lib/           LLM client, bitget public client, logger, errors
  perceive/      market, news, on-chain, regime classifier
  portfolio/     paper wallet ledger
  storage/       journal append and read
public/          dashboard
scripts/         export utilities
submissions/     paper trading log for the hackathon form
data/            runtime state, gitignored
```

## License

MIT. See [LICENSE](LICENSE).

## Related

- [Bitget AI Hackathon docs](https://bitget-ai.gitbook.io/hackathon)
- [Bitget Agent Hub](https://www.bitget.com/activity-hub/agent-hub)
- [bitget-core on npm](https://www.npmjs.com/package/bitget-core)
