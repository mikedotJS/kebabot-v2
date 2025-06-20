import type { Client, TextChannel } from "discord.js";

export interface CronLogDoc {
  job: string;
  status: "started" | "success" | "error";
  timestamp: Date;
  details?: string;
  error?: string;
}

export interface CronJobConfig {
  name: string;
  schedule: string;
  channelId: string;
  executeFunction: (channel: TextChannel) => Promise<void>;
  description: string;
}

export interface SchedulerContext {
  client: Client;
  logCronEvent: (log: CronLogDoc) => Promise<void>;
}
