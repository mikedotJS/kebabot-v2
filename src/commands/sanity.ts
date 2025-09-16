import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";
import {
  getCharacter,
  updateCharacterSanity,
  addCharacterCondition,
} from "../features/coc-characters.js";

// Sanity loss tables for different scenarios
const SANITY_LOSS = {
  minor: { success: 0, failure: "1d4" },
  moderate: { success: "1d2", failure: "1d6" },
  major: { success: "1d4", failure: "1d8" },
  severe: { success: "1d6", failure: "1d10" },
  extreme: { success: "1d10", failure: "1d20" },
};

export default {
  data: new SlashCommandBuilder()
    .setName("sanity")
    .setDescription("Make a Sanity check with automatic loss calculation")
    .addStringOption((option) =>
      option
        .setName("severity")
        .setDescription("Severity of the sanity-threatening event")
        .setRequired(true)
        .addChoices(
          { name: "Minor (0/1d4)", value: "minor" },
          { name: "Moderate (1d2/1d6)", value: "moderate" },
          { name: "Major (1d4/1d8)", value: "major" },
          { name: "Severe (1d6/1d10)", value: "severe" },
          { name: "Extreme (1d10/1d20)", value: "extreme" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of what caused the sanity loss")
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

    const severity = interaction.options.getString(
      "severity",
      true
    ) as keyof typeof SANITY_LOSS;
    const description = interaction.options.getString("description");

    const sanityCheck = DiceRoller.rollCoCSkill(character.sanity.current);
    const lossData = SANITY_LOSS[severity];

    let sanityLoss = 0;
    let lossRoll = "";

    if (sanityCheck.success) {
      // Success - lesser loss
      if (lossData.success === 0) {
        sanityLoss = 0;
        lossRoll = "0";
      } else {
        const roll = DiceRoller.rollDice(lossData.success as string);
        sanityLoss = roll.total;
        lossRoll = `${lossData.success} (${roll.rolls.join("+")})`;
      }
    } else {
      // Failure - greater loss
      const roll = DiceRoller.rollDice(lossData.failure);
      sanityLoss = roll.total;
      lossRoll = `${lossData.failure} (${roll.rolls.join("+")})`;
    }

    const newSanity = Math.max(0, character.sanity.current - sanityLoss);
    await updateCharacterSanity(interaction.user.id, newSanity);

    let output = `🧠 **${character.name}** - Sanity Check\n`;
    if (description) {
      output += `*${description}*\n\n`;
    }

    output += `Current Sanity: ${character.sanity.current} | Rolled: **${sanityCheck.total}**\n`;
    output += `Severity: ${
      severity.charAt(0).toUpperCase() + severity.slice(1)
    }\n\n`;

    if (sanityCheck.success) {
      if (sanityCheck.extremeSuccess) {
        output += "🌟 **EXTREME SUCCESS!** 🌟\n";
      } else if (sanityCheck.hardSuccess) {
        output += "✨ **HARD SUCCESS!** ✨\n";
      } else {
        output += "✅ **SUCCESS!**\n";
      }
    } else {
      if (sanityCheck.fumble) {
        output += "💀 **FUMBLE!** 💀\n";
      } else {
        output += "❌ **FAILURE**\n";
      }
    }

    if (sanityLoss > 0) {
      output += `\n💔 **Sanity Lost:** ${lossRoll} = **${sanityLoss}** points\n`;
      output += `🧠 **New Sanity:** ${newSanity}/${character.sanity.maximum}`;

      // Check for temporary insanity (lost 5+ sanity in one go)
      if (sanityLoss >= 5) {
        output += `\n\n⚠️ **Temporary Insanity!** (Lost ${sanityLoss} sanity in one check)`;
        await addCharacterCondition(interaction.user.id, "Temporary Insanity");
      }

      // Check for indefinite insanity (sanity reduced to 1/5 of starting)
      const insanityThreshold = Math.floor(character.sanity.starting / 5);
      if (
        newSanity <= insanityThreshold &&
        character.sanity.current > insanityThreshold
      ) {
        output += `\n\n🔥 **INDEFINITE INSANITY!** (Sanity ≤ ${insanityThreshold})`;
        await addCharacterCondition(interaction.user.id, "Indefinite Insanity");
      }
    } else {
      output += `\n💚 **No Sanity Lost!**\n`;
      output += `🧠 **Current Sanity:** ${character.sanity.current}/${character.sanity.maximum}`;
    }

    await interaction.editReply(output);
  },
};
