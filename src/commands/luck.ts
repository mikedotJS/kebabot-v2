import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";
import {
  getCharacter,
  updateCharacterLuck,
} from "../features/coc-characters.js";

export default {
  data: new SlashCommandBuilder()
    .setName("luck")
    .setDescription("Make a Luck roll (spends 1 Luck point on success)")
    .addBooleanOption((option) =>
      option
        .setName("spend")
        .setDescription(
          "Whether to spend Luck point on success (default: true)"
        )
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const character = await getCharacter(interaction.user.id);
    if (!character) {
      await interaction.editReply({
        content:
          "❌ You don't have a character yet!\n\nUse `/character create` to create one first.",
      });
      return;
    }

    const shouldSpend = interaction.options.getBoolean("spend") ?? true;

    if (character.luck.current <= 0) {
      await interaction.editReply({
        content: `❌ **${character.name}** has no Luck points remaining! (0/${character.luck.starting})`,
      });
      return;
    }

    const result = DiceRoller.rollCoCSkill(character.luck.current);

    let output = `🍀 **${character.name}** - Luck Roll\n`;
    output += `Current Luck: ${character.luck.current} | Rolled: **${result.total}**\n\n`;

    if (result.success) {
      if (result.extremeSuccess) {
        output += "🌟 **EXTREME SUCCESS!** 🌟\n";
      } else if (result.hardSuccess) {
        output += "✨ **HARD SUCCESS!** ✨\n";
      } else {
        output += "✅ **SUCCESS!**\n";
      }

      if (shouldSpend) {
        const newLuck = character.luck.current - 1;
        await updateCharacterLuck(interaction.user.id, newLuck);
        output += `\n💰 Luck spent! New Luck: **${newLuck}**/${character.luck.starting}`;
      } else {
        output += `\n💰 Luck not spent (current: ${character.luck.current}/${character.luck.starting})`;
      }
    } else {
      if (result.fumble) {
        output += "💀 **FUMBLE!** 💀\n";
      } else {
        output += "❌ **FAILURE**\n";
      }
      output += `\n💰 No Luck spent (current: ${character.luck.current}/${character.luck.starting})`;
    }

    await interaction.editReply(output);
  },
};
