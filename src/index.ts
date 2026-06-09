import { runAgentCycle, runAgentLoop } from "./agent/loop.js";
import { initSettings, getSettingsSync } from "./config/settings.js";
import { logger } from "./lib/logger.js";

const command = process.argv[2] ?? "once";

async function main() {
  await initSettings();
  const settings = getSettingsSync();

  logger.info("vector.boot", {
    command,
    symbol: settings.symbol,
    dryRun: settings.dryRun,
  });

  switch (command) {
    case "once": {
      const record = await runAgentCycle();
      console.log(JSON.stringify(record, null, 2));
      break;
    }
    case "run": {
      await runAgentLoop();
      break;
    }
    case "run:3": {
      await runAgentLoop(3);
      break;
    }
    case "batch": {
      const count = Number(process.argv[3] ?? 5);
      if (!Number.isFinite(count) || count < 1 || count > 20) {
        console.error("Usage: pnpm batch <1-20>");
        process.exit(1);
      }
      logger.info("vector.batch", { count });
      await runAgentLoop(count, 10_000);
      break;
    }
    default:
      console.log(`Usage:
  pnpm start            # single cycle
  pnpm agent:once       # single cycle
  pnpm agent:run        # continuous loop
  pnpm batch 5          # run 5 cycles (builds journal history)
  pnpm api              # demo API server`);
      process.exit(1);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Fatal error";
  logger.error("vector.fatal", { message });
  console.error("\nVector cycle failed:\n", message, "\n");
  process.exit(1);
});
