import type { TextChannel } from "discord.js";

export const dailyTriviaJob = {
  name: "daily_trivia",
  schedule: "0 19 * * *",
  description: "daily trivia cron job",
  executeFunction: async (channel: TextChannel) => {
    const { askDailyTrivia } = await import("../../features/trivia.js");
    await askDailyTrivia(channel);
  },
};
