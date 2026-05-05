import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { createApp } from "./app";
import { connectDb } from "./db/connect";

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`api listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "failed to start api");
  process.exit(1);
});
