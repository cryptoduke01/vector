# Bitget Hackathon Registration

## Team name
```
Vector
```

## Competition track
```
Trading agent
```

## Team introduction (144 chars)
```
Vector: 4-channel Signal Tribunal fuses market data, then Qwen reconciles conflicts before Bitget execution. Regime-aware risk + paper PnL ledger. S1.
```

## Project description (submission, ~180 words)

Vector solves a problem most AI trading bots ignore: **they trade on one noisy signal and can't explain disagreements**.

Before Qwen decides anything, Vector runs a **Signal Tribunal** — four independent channels (technical, funding, news, on-chain/Solana) each vote bullish, bearish, or neutral. When channels conflict, Vector reduces size or holds. Qwen's job is to reconcile the jury, not guess from a black box.

Vector then classifies the **market regime** (trend / range / volatile) and applies hard risk guardrails: max notional, leverage cap, mandatory stop-loss. Trades execute on Bitget USDT perpetuals via `bitget-core` (dry-run or live). Every cycle is logged to an audit journal with a **paper PnL ledger** — equity curve, win rate, simulated trade history.

**Bitget modules used:** Agent Hub / bitget-core API, hackathon Qwen (`qwen3.6-plus`), sim trading records per official rules.

**Loop:** Perceive → Tribunal → Qwen decide → Risk guard → Execute → Journal
