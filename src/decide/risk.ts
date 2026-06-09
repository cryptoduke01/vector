import { getSettingsSync } from "../config/settings.js";
import type { RiskVerdict, TradeDecision, TribunalVerdict } from "../types.js";

export function applyRiskGuards(
  decision: TradeDecision,
  tribunal: TribunalVerdict
): RiskVerdict {
  const violations: string[] = [];
  const adjusted: TradeDecision = { ...decision };

  if (tribunal.conflict && (adjusted.action === "long" || adjusted.action === "short")) {
    violations.push("Signal tribunal conflict — halving size");
    adjusted.notionalUsdt = Math.floor(adjusted.notionalUsdt / 2);
    adjusted.confidence = Math.min(adjusted.confidence, 0.6);
  }

  if (tribunal.alignment < 0.5 && adjusted.action !== "hold" && adjusted.action !== "close") {
    violations.push("Low signal alignment (<50%) — forcing hold");
    adjusted.action = "hold";
    adjusted.notionalUsdt = 0;
  }

  if (adjusted.confidence < 0.55 && adjusted.action !== "hold" && adjusted.action !== "close") {
    violations.push("Confidence below 0.55 — forcing hold");
    adjusted.action = "hold";
    adjusted.notionalUsdt = 0;
  }

  const settings = getSettingsSync();
  if (adjusted.notionalUsdt > settings.maxNotionalUsdt) {
    violations.push(
      `Notional ${adjusted.notionalUsdt} exceeds cap ${settings.maxNotionalUsdt} USDT`
    );
    adjusted.notionalUsdt = settings.maxNotionalUsdt;
  }

  if (adjusted.leverage > settings.maxLeverage) {
    violations.push(`Leverage ${adjusted.leverage} exceeds cap ${settings.maxLeverage}x`);
    adjusted.leverage = settings.maxLeverage;
  }

  if (
    (adjusted.action === "long" || adjusted.action === "short") &&
    adjusted.stopLossPct === null
  ) {
    violations.push("Missing stop-loss — injecting 2% default");
    adjusted.stopLossPct = 2;
  }

  if (adjusted.notionalUsdt <= 0 && (adjusted.action === "long" || adjusted.action === "short")) {
    violations.push("Zero notional on directional action — forcing hold");
    adjusted.action = "hold";
  }

  const approved =
    violations.length === 0 ||
    violations.every(
      (v) =>
        v.includes("injecting") ||
        v.includes("exceeds cap") ||
        v.includes("halving")
    );

  return {
    approved,
    adjustedDecision: adjusted,
    violations,
  };
}
