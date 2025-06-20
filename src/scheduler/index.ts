import type { Client } from "discord.js";
import { createCronJobs } from "./factory.js";
import { queryCollection } from "../config/db.js";
import type { CronLogDoc } from "./types.js";

let isCronRegistered = false;

export async function initSchedulers(client: Client): Promise<void> {
  if (isCronRegistered) {
    console.log(
      "[Scheduler] Cron jobs are already registered. Skipping registration."
    );
    return;
  }

  console.log("[Scheduler] Registering cron jobs...");

  try {
    await createCronJobs(client);
    isCronRegistered = true;
    console.log("[Scheduler] All cron jobs registered successfully.");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Scheduler] Failed to register cron jobs:", error);
    queryCollection<void, CronLogDoc>("cron_logs", async (collection) => {
      await collection.insertOne({
        job: "cron_registration",
        status: "error",
        timestamp: new Date(),
        error: errMsg,
      });
    });
  }
}

export type { CronJobConfig, CronLogDoc } from "./types.js";
