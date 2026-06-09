import { VectorError } from "./errors.js";

const BITGET_BASE = process.env.BITGET_API_BASE_URL?.replace(/\/+$/, "") || "https://api.bitget.com";
const TIMEOUT_MS = Number(process.env.BITGET_TIMEOUT_MS ?? 30_000);
const RETRIES = Number(process.env.BITGET_RETRIES ?? 3);

type BitgetResponse<T> = {
  code: string;
  msg?: string;
  data?: T;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bitgetPublicGet<T>(
  path: string,
  query: Record<string, string>
): Promise<T> {
  const params = new URLSearchParams(query);
  const url = `${BITGET_BASE}${path}?${params.toString()}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          locale: "en-US",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const text = await response.text();
      let payload: BitgetResponse<T>;
      try {
        payload = JSON.parse(text) as BitgetResponse<T>;
      } catch {
        throw new VectorError(
          "BITGET_BAD_RESPONSE",
          `Bitget returned non-JSON (HTTP ${response.status}): ${text.slice(0, 120)}`
        );
      }

      if (!response.ok) {
        throw new VectorError(
          "BITGET_HTTP_ERROR",
          `Bitget HTTP ${response.status}: ${payload.msg ?? text.slice(0, 120)}`
        );
      }

      if (payload.code !== "00000") {
        throw new VectorError(
          "BITGET_API_ERROR",
          `Bitget API ${payload.code}: ${payload.msg ?? "unknown error"}`
        );
      }

      if (payload.data === undefined) {
        throw new VectorError("BITGET_EMPTY_DATA", `Bitget returned no data for ${path}`);
      }

      return payload.data;
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.name === "TimeoutError" ||
            error.message.includes("fetch failed") ||
            error.message.includes("network")));

      if (!retryable || attempt === RETRIES) {
        break;
      }

      await sleep(attempt * 1000);
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "Unknown network error";

  throw new VectorError(
    "BITGET_NETWORK_FAILED",
    `Could not reach Bitget API after ${RETRIES} attempts. ${detail}. Check your internet or try a VPN if Bitget is blocked in your region.`
  );
}
