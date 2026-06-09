import { Exa } from "exa-js";
import { env, hasExa } from "../config/env.js";
import type { NewsItem } from "../types.js";

function getExaClient(): Exa | null {
  if (!hasExa || !env.EXA_API_KEY) {
    return null;
  }
  return new Exa(env.EXA_API_KEY);
}

export async function perceiveNews(symbol: string): Promise<NewsItem[]> {
  const exa = getExaClient();
  if (!exa) {
    return [];
  }

  const asset = symbol.replace("USDT", "");
  const query = `${asset} crypto market news sentiment last 24 hours`;

  try {
    const response = await exa.search(query, {
      type: "auto",
      numResults: 6,
      contents: {
        text: { maxCharacters: 400 },
      },
    });

    return response.results.map((result) => ({
      title: result.title ?? "Untitled",
      url: result.url,
      snippet: result.text?.slice(0, 400) ?? "",
      publishedAt: result.publishedDate ?? null,
    }));
  } catch {
    return [];
  }
}
