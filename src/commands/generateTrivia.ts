import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { askDailyTrivia } from "../features/trivia.js";

export default {
  data: new SlashCommandBuilder()
    .setName("generatetrivia")
    .setDescription(
      "Generate a new trivia question in this channel (admin only)."
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply();
    try {
      if (
        interaction.channel &&
        interaction.channel.isTextBased() &&
        interaction.channel.type === 0 // 0 = GUILD_TEXT in discord.js v14
      ) {
        await askDailyTrivia(
          interaction.channel as import("discord.js").TextChannel
        );
        await interaction.editReply({ content: "Trivia question generated!" });
      } else {
        await interaction.editReply({
          content: "This command can only be used in a text channel.",
        });
      }
    } catch (error) {
      await interaction.editReply({
        content: "Failed to generate a trivia question.",
      });
    }
  },
};
