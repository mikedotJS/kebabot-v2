import type { Client, TextChannel } from "discord.js";
import cron from "node-cron";
import env from "../config/env.js";
import { queryCollection } from "../config/db.js";
import type { CronJobConfig, CronLogDoc } from "./types.js";

async function logCronEvent(log: CronLogDoc): Promise<void> {
  await queryCollection<void, CronLogDoc>("cron_logs", async (collection) => {
    await collection.insertOne(log);
  });
}

function createCronJob(client: Client, config: CronJobConfig): void {
  const { name, schedule, channelId, executeFunction, description } = config;

  console.log(`[Scheduler] Registering ${description}...`);

  cron.schedule(
    schedule,
    async () => {
      console.log(`[Scheduler] Running ${description}...`);

      await logCronEvent({
        job: name,
        status: "started",
        timestamp: new Date(),
      });

      const channel = client.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        const warnMsg = `${description} channel not found or not text-based.`;
        console.warn(`[Scheduler] ${warnMsg}`);
        await logCronEvent({
          job: name,
          status: "error",
          timestamp: new Date(),
          details: warnMsg,
        });
        return;
      }

      try {
        await executeFunction(channel as TextChannel);
        console.log(`[Scheduler] ${description} sent successfully.`);
        await logCronEvent({
          job: name,
          status: "success",
          timestamp: new Date(),
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Scheduler] Failed to send ${description}:`, err);
        await logCronEvent({
          job: name,
          status: "error",
          timestamp: new Date(),
          error: errMsg,
        });
      }
    },
    {
      timezone: env.TIMEZONE,
      scheduled: true,
    }
  );

  console.log(`[Scheduler] ${description} registered successfully.`);
}

export async function createCronJobs(client: Client): Promise<void> {
  const { cronJobs } = await import("./jobs/index.js");

  cronJobs.forEach((job) => createCronJob(client, job));
}
