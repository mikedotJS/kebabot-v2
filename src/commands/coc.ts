import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";
import { getCharacter } from "../features/coc-characters.js";

export default {
  data: new SlashCommandBuilder()
    .setName("coc")
    .setDescription(
      "Make a Call of Cthulhu skill check using your character's skills"
    )
    .addStringOption((option) =>
      option
        .setName("skill")
        .setDescription(
          "Skill name (e.g., 'spot hidden', 'psychology', 'library use')"
        )
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("difficulty")
        .setDescription("Difficulty modifier")
        .setRequired(false)
        .addChoices(
          { name: "Normal", value: "normal" },
          { name: "Hard (-20)", value: "hard" },
          { name: "Extreme (-40)", value: "extreme" },
          { name: "Bonus (+20)", value: "bonus" }
        )
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

    const skillName = interaction.options
      .getString("skill", true)
      .toLowerCase();
    const difficulty = interaction.options.getString("difficulty") || "normal";

    // Find the skill (flexible matching)
    let skillValue: number | undefined;
    let actualSkillName = skillName;

    // Direct match first
    if (character.skills[skillName] !== undefined) {
      skillValue = character.skills[skillName];
    } else {
      // Fuzzy matching for common variations
      const skillKeys = Object.keys(character.skills);
      const matchedSkill = skillKeys.find(
        (key) =>
          key.includes(skillName) ||
          skillName.includes(key) ||
          key.replace(/\s+/g, "").toLowerCase() ===
            skillName.replace(/\s+/g, "").toLowerCase()
      );

      if (matchedSkill) {
        skillValue = character.skills[matchedSkill];
        actualSkillName = matchedSkill;
      }
    }

    if (skillValue === undefined) {
      await interaction.editReply({
        content: `❌ Skill "${skillName}" not found for **${character.name}**.\n\nUse \`/character show\` to see available skills, or \`/character set ${skillName} [value]\` to add it.`,
      });
      return;
    }

    // Apply difficulty modifiers
    let modifiedSkill = skillValue;
    let difficultyText = "";

    switch (difficulty) {
      case "hard":
        modifiedSkill = Math.floor(skillValue / 2);
        difficultyText = " (Hard)";
        break;
      case "extreme":
        modifiedSkill = Math.floor(skillValue / 5);
        difficultyText = " (Extreme)";
        break;
      case "bonus":
        modifiedSkill = Math.min(95, skillValue + 20);
        difficultyText = " (Bonus)";
        break;
    }

    const result = DiceRoller.rollCoCSkill(modifiedSkill);

    let output = `🎲 **${character.name}** - ${
      actualSkillName.charAt(0).toUpperCase() + actualSkillName.slice(1)
    }${difficultyText}\n`;
    output += `Base Skill: ${skillValue}% | Target: ${modifiedSkill}% | Rolled: **${result.total}**\n\n`;

    if (result.success) {
      if (result.extremeSuccess) {
        output += "🌟 **EXTREME SUCCESS!** 🌟";
      } else if (result.hardSuccess) {
        output += "✨ **HARD SUCCESS!** ✨";
      } else {
        output += "✅ **SUCCESS!**";
      }
    } else {
      if (result.fumble) {
        output += "💀 **FUMBLE!** 💀";
      } else {
        output += "❌ **FAILURE**";
      }
    }

    await interaction.editReply(output);
  },
};
