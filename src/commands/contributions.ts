import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getContribution } from "../features/contributions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("contributions")
    .setDescription("Show your contribution count."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: "Ephemeral" });

    const count = await getContribution(interaction.user.id);
    await interaction.editReply({
      content: `You have contributed ${count} messages!`,
    });
  },
};
