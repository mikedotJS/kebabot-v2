import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getTriviaLeaderboard } from "../features/trivia.js";

export default {
  data: new SlashCommandBuilder()
    .setName("trivialeaderboard")
    .setDescription("Show the top trivia players."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: "Ephemeral" });
    try {
      const leaderboard = await getTriviaLeaderboard();
      if (leaderboard.length === 0) {
        await interaction.editReply({ content: "No trivia points yet!" });
        return;
      }
      const lines = await Promise.all(
        leaderboard.slice(0, 10).map(async ({ userId, points }, i) => {
          const user = await interaction.client.users.fetch(userId);
          return `${i + 1}. ${user.tag}: ${points} point(s)`;
        })
      );
      await interaction.editReply(`Trivia Leaderboard:\n${lines.join("\n")}`);
    } catch (error) {
      await interaction.followUp({
        content: "An error occurred while fetching the trivia leaderboard.",
      });
    }
  },
};
