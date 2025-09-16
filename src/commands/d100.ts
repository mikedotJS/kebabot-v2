import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";

export default {
  data: new SlashCommandBuilder()
    .setName("d100")
    .setDescription("Roll a d100 (percentile dice)"),
  async execute(interaction: ChatInputCommandInteraction) {
    const roll = DiceRoller.rollPercentile();

    await interaction.reply(`🎲 **d100**: **${roll}**`);
  },
};
