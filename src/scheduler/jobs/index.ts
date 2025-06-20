import type { CronJobConfig } from "../types.js";
import env from "../../config/env.js";
import { dailyTriviaJob } from "./dailyTrivia.js";
import { weeklyContributorsJob } from "./weeklyContributors.js";

export const cronJobs: CronJobConfig[] = [
  {
    ...dailyTriviaJob,
    channelId: env.TRIVIA_CHANNEL_ID,
  },
  {
    ...weeklyContributorsJob,
    channelId: env.WEEKLY_ANNOUNCEMENTS_CHANNEL_ID,
  },
];

export { dailyTriviaJob, weeklyContributorsJob };
