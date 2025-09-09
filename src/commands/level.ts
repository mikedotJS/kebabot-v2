import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getUserLevel } from "../features/contributions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your current level and XP progress."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: "Ephemeral" });

    const userLevel = await getUserLevel(interaction.user.id);
    const expToNext = userLevel.nextLevelExp - userLevel.contributions;
    
    await interaction.editReply({
      content: `🎯 **Level ${userLevel.level}**\n📊 **XP**: ${userLevel.contributions}/${userLevel.nextLevelExp}\n🚀 **${expToNext} XP** to next level`,
    });
  },
};