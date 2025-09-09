import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getLeaderboard, calculateLevel } from "../features/contributions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top contributors."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: "Ephemeral" });

    try {
      const leaderboard = await getLeaderboard(5);
      if (leaderboard.length === 0) {
        await interaction.editReply({
          content: "No contributions yet!",
        });
        return;
      }
      const lines = await Promise.all(
        leaderboard.map(async ({ userId, count }, i) => {
          const user = await interaction.client.users.fetch(userId);
          const level = calculateLevel(count);
          return `${i + 1}. ${user.tag}: ${count} XP (Level ${level})`;
        })
      );
      await interaction.editReply(`Top contributors:\n${lines.join("\n")}`);
    } catch (error) {
      await interaction.followUp({
        content: "An error occurred while fetching the leaderboard.",
      });
    }
  },
};
