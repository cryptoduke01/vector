import { BitgetRestClient, loadConfig } from "bitget-core";
import { hasBitgetAuth } from "../config/env.js";
import { getSettingsSync } from "../config/settings.js";
import { VectorError } from "../lib/errors.js";
import type { ExecutionResult, TradeDecision } from "../types.js";

type PositionRow = {
  symbol?: string;
  holdSide?: string;
  total?: string;
};

type OrderResponse = {
  orderId?: string;
  clientOid?: string;
};

function getTradingClient(): BitgetRestClient {
  if (!hasBitgetAuth) {
    throw new VectorError(
      "BITGET_NOT_CONFIGURED",
      "Set BITGET_API_KEY, BITGET_SECRET_KEY, BITGET_PASSPHRASE for live execution"
    );
  }

  const config = loadConfig({
    readOnly: false,
    paperTrading: getSettingsSync().dryRun,
  });

  return new BitgetRestClient(config);
}

function calcSize(decision: TradeDecision, price: number): string {
  const notional = decision.notionalUsdt * decision.leverage;
  const size = notional / price;
  return size.toFixed(4);
}

async function getOpenPosition(symbol: string): Promise<PositionRow | null> {
  const client = getTradingClient();
  const { productType } = getSettingsSync();
  const result = await client.privateGet<PositionRow[]>("/api/v2/mix/position/single-position", {
    symbol,
    productType,
    marginCoin: "USDT",
  });

  const row = Array.isArray(result.data) ? result.data[0] : null;
  if (!row?.total || Number(row.total) === 0) {
    return null;
  }
  return row;
}

export async function executeDecision(
  decision: TradeDecision,
  lastPrice: number
): Promise<ExecutionResult> {
  if (decision.action === "hold") {
    return {
      status: "skipped",
      orderId: null,
      message: "Agent chose hold — no order placed",
      details: { action: "hold" },
    };
  }

  const settings = getSettingsSync();
  if (settings.dryRun) {
    return {
      status: "simulated",
      orderId: `sim-${Date.now()}`,
      message: `Dry-run ${decision.action} ${settings.symbol} (~${decision.notionalUsdt} USDT @ ${decision.leverage}x)`,
      details: {
        action: decision.action,
        symbol: settings.symbol,
        size: calcSize(decision, lastPrice),
        stopLossPct: decision.stopLossPct,
        takeProfitPct: decision.takeProfitPct,
        price: lastPrice,
      },
    };
  }

  const client = getTradingClient();
  const { symbol, productType } = getSettingsSync();
  const size = calcSize(decision, lastPrice);

  if (decision.action === "close") {
    const position = await getOpenPosition(symbol);
    if (!position) {
      return {
        status: "skipped",
        orderId: null,
        message: "No open position to close",
        details: {},
      };
    }

    const closeSide = position.holdSide === "long" ? "sell" : "buy";
    const result = await client.privatePost<OrderResponse>("/api/v2/mix/order/place-order", {
      symbol,
      productType,
      marginMode: "crossed",
      marginCoin: "USDT",
      size: position.total,
      side: closeSide,
      orderType: "market",
      tradeSide: "close",
    });

    return {
      status: "executed",
      orderId: result.data?.orderId ?? null,
      message: "Close order submitted",
      details: { raw: result.data },
    };
  }

  const side = decision.action === "long" ? "buy" : "sell";
  const body: Record<string, string> = {
    symbol,
    productType,
    marginMode: "crossed",
    marginCoin: "USDT",
    size,
    side,
    orderType: "market",
    tradeSide: "open",
  };

  if (decision.stopLossPct) {
    const slDistance = lastPrice * (decision.stopLossPct / 100);
    const slTrigger =
      decision.action === "long"
        ? (lastPrice - slDistance).toFixed(2)
        : (lastPrice + slDistance).toFixed(2);
    body.presetStopLossPrice = slTrigger;
  }

  if (decision.takeProfitPct) {
    const tpDistance = lastPrice * (decision.takeProfitPct / 100);
    const tpTrigger =
      decision.action === "long"
        ? (lastPrice + tpDistance).toFixed(2)
        : (lastPrice - tpDistance).toFixed(2);
    body.presetStopSurplusPrice = tpTrigger;
  }

  await client.privatePost("/api/v2/mix/account/set-leverage", {
    symbol,
    productType,
    marginCoin: "USDT",
    leverage: String(decision.leverage),
  });

  const result = await client.privatePost<OrderResponse>("/api/v2/mix/order/place-order", body);

  return {
    status: "executed",
    orderId: result.data?.orderId ?? null,
    message: `${decision.action} order submitted`,
    details: { raw: result.data, size, side },
  };
}
