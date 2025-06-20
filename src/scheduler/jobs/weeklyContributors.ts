import type { TextChannel } from "discord.js";

export const weeklyContributorsJob = {
  name: "weekly_contributors",
  schedule: "0 19 * * 0",
  description: "weekly contributors cron job",
  executeFunction: async (channel: TextChannel) => {
    const { displayWeeklyTopContributors } = await import(
      "../../features/contributions.js"
    );
    await displayWeeklyTopContributors(channel);
  },
};
