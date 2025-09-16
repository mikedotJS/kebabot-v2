import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";

export default {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription(
      "Roll dice using standard notation (e.g., 1d20+5, 3d6, 1d20 advantage)"
    )
    .addStringOption((option) =>
      option
        .setName("dice")
        .setDescription(
          "Dice notation (e.g., 1d20+5, 3d6, 4d6 drop lowest, 1d20 advantage)"
        )
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const diceNotation = interaction.options.getString("dice", true);

    try {
      const result = DiceRoller.rollDice(diceNotation);
      const formattedResult = DiceRoller.formatRollResult(result);

      await interaction.reply(formattedResult);
    } catch (error) {
      await interaction.reply({
        content: `❌ Invalid dice notation: \`${diceNotation}\`\n\nExamples:\n• \`1d20+5\` - d20 with +5 modifier\n• \`3d6\` - Three six-sided dice\n• \`4d6 drop lowest\` - Four d6, drop the lowest\n• \`1d20 advantage\` - Roll with advantage`,
        ephemeral: true,
      });
    }
  },
};
