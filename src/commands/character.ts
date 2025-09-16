import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import {
  createCharacter,
  getCharacter,
  updateCharacterSkill,
  formatCharacterSheet,
  type CoCCharacter,
} from "../features/coc-characters.js";
import { DiceRoller } from "../features/dice.js";

export default {
  data: new SlashCommandBuilder()
    .setName("character")
    .setDescription("Manage your Call of Cthulhu character")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new Call of Cthulhu investigator")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Character name")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("occupation")
            .setDescription("Character occupation")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("age")
            .setDescription("Character age")
            .setRequired(true)
            .setMinValue(15)
            .setMaxValue(90)
        )
        .addStringOption((option) =>
          option
            .setName("method")
            .setDescription("Characteristic generation method")
            .setRequired(false)
            .addChoices(
              { name: "Roll (3d6*5)", value: "roll" },
              { name: "Point Buy (Assign 460 points)", value: "pointbuy" },
              { name: "Manual (Enter all values)", value: "manual" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("Display your character sheet")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Update a character skill or attribute")
        .addStringOption((option) =>
          option
            .setName("skill")
            .setDescription("Skill name (e.g., 'spot hidden', 'psychology')")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("New skill value (0-100)")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("backstory")
        .setDescription("Edit your character's backstory and personal details")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await handleCharacterCreate(interaction);
    } else if (subcommand === "show") {
      await handleCharacterShow(interaction);
    } else if (subcommand === "set") {
      await handleCharacterSet(interaction);
    } else if (subcommand === "backstory") {
      await handleCharacterBackstory(interaction);
    }
  },
};

async function handleCharacterCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  // Check if user already has a character
  const existingCharacter = await getCharacter(interaction.user.id);
  if (existingCharacter) {
    await interaction.editReply({
      content: `❌ You already have a character: **${existingCharacter.name}**\n\nUse \`/character show\` to view your character sheet.`,
    });
    return;
  }

  const name = interaction.options.getString("name", true);
  const occupation = interaction.options.getString("occupation", true);
  const age = interaction.options.getInteger("age", true);
  const method = interaction.options.getString("method") || "roll";

  try {
    let characteristics: CoCCharacter["characteristics"];

    if (method === "roll") {
      // Roll 3d6*5 for each characteristic
      characteristics = {
        STR: DiceRoller.rollDice("3d6").total * 5,
        DEX: DiceRoller.rollDice("3d6").total * 5,
        INT: DiceRoller.rollDice("3d6").total * 5,
        CON: DiceRoller.rollDice("3d6").total * 5,
        APP: DiceRoller.rollDice("3d6").total * 5,
        POW: DiceRoller.rollDice("3d6").total * 5,
        SIZ: DiceRoller.rollDice("3d6").total * 5,
        EDU: DiceRoller.rollDice("3d6").total * 5,
      };
    } else if (method === "pointbuy") {
      // Standard point buy (assign 460 points)
      characteristics = {
        STR: 50,
        DEX: 50,
        INT: 50,
        CON: 50,
        APP: 50,
        POW: 50,
        SIZ: 50,
        EDU: 70,
      };
    } else {
      // Manual - use defaults for now, user can modify with /character set
      characteristics = {
        STR: 50,
        DEX: 50,
        INT: 50,
        CON: 50,
        APP: 50,
        POW: 50,
        SIZ: 50,
        EDU: 50,
      };
    }

    const character = await createCharacter(
      interaction.user.id,
      name,
      occupation,
      age,
      characteristics
    );

    const embed = new EmbedBuilder()
      .setColor(0x8b0000) // Dark red for CoC theme
      .setTitle(`📜 Character Created: ${character.name}`)
      .setDescription(`**${occupation}**, Age ${age}`)
      .addFields(
        {
          name: "Characteristics",
          value: `STR: ${characteristics.STR} | DEX: ${characteristics.DEX} | INT: ${characteristics.INT} | CON: ${characteristics.CON}\nAPP: ${characteristics.APP} | POW: ${characteristics.POW} | SIZ: ${characteristics.SIZ} | EDU: ${characteristics.EDU}`,
          inline: false,
        },
        {
          name: "Derived Attributes",
          value: `❤️ HP: ${character.hitPoints.maximum} | 🧠 Sanity: ${character.sanity.current} | 🍀 Luck: ${character.luck.current} | ✨ MP: ${character.magicPoints.maximum}`,
          inline: false,
        }
      )
      .setFooter({
        text: "Use /character show to see your full character sheet",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Character creation error:", error);
    await interaction.editReply({
      content: "❌ Failed to create character. Please try again.",
    });
  }
}

async function handleCharacterShow(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const character = await getCharacter(interaction.user.id);
  if (!character) {
    await interaction.editReply({
      content:
        "❌ You don't have a character yet!\n\nUse `/character create` to create one.",
    });
    return;
  }

  const characterSheet = formatCharacterSheet(character);

  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(`📜 ${character.name}`)
    .setDescription(characterSheet)
    .setFooter({
      text: `Last updated: ${character.updatedAt.toLocaleDateString()}`,
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleCharacterSet(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const character = await getCharacter(interaction.user.id);
  if (!character) {
    await interaction.editReply({
      content:
        "❌ You don't have a character yet!\n\nUse `/character create` to create one.",
    });
    return;
  }

  const skillName = interaction.options.getString("skill", true).toLowerCase();
  const value = interaction.options.getInteger("value", true);

  try {
    await updateCharacterSkill(interaction.user.id, skillName, value);

    await interaction.editReply({
      content: `✅ Updated **${character.name}**'s **${skillName}** to **${value}%**`,
    });
  } catch (error) {
    console.error("Skill update error:", error);
    await interaction.editReply({
      content: "❌ Failed to update skill. Please try again.",
    });
  }
}

async function handleCharacterBackstory(
  interaction: ChatInputCommandInteraction
) {
  const character = await getCharacter(interaction.user.id);
  if (!character) {
    await interaction.reply({
      content:
        "❌ You don't have a character yet!\n\nUse `/character create` to create one first.",
      ephemeral: true,
    });
    return;
  }

  // Create modal with text inputs for backstory fields
  const modal = new ModalBuilder()
    .setCustomId("character_backstory")
    .setTitle(`📜 ${character.name} - Backstory`);

  // Personal Description
  const personalDescriptionInput = new TextInputBuilder()
    .setCustomId("personal_description")
    .setLabel("Personal Description")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Describe your character's appearance, mannerisms, etc.")
    .setValue(character.personalDescription || "")
    .setRequired(false)
    .setMaxLength(1000);

  // Ideology/Beliefs
  const ideologyInput = new TextInputBuilder()
    .setCustomId("ideology_beliefs")
    .setLabel("Ideology & Beliefs")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("What drives your character? What do they believe in?")
    .setValue(character.ideologyBeliefs || "")
    .setRequired(false)
    .setMaxLength(500);

  // Significant People
  const significantPeopleInput = new TextInputBuilder()
    .setCustomId("significant_people")
    .setLabel("Significant People")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Important people in your character's life")
    .setValue(character.significantPeople || "")
    .setRequired(false)
    .setMaxLength(500);

  // Meaningful Locations
  const meaningfulLocationsInput = new TextInputBuilder()
    .setCustomId("meaningful_locations")
    .setLabel("Meaningful Locations")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Places that matter to your character")
    .setValue(character.meaningfulLocations || "")
    .setRequired(false)
    .setMaxLength(500);

  // Treasured Possessions
  const treasuredPossessionsInput = new TextInputBuilder()
    .setCustomId("treasured_possessions")
    .setLabel("Treasured Possessions")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Items your character values most")
    .setValue(character.treasuredPossessions || "")
    .setRequired(false)
    .setMaxLength(200);

  // Create action rows (Discord limits modals to 5 components)
  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    personalDescriptionInput
  );
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    ideologyInput
  );
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    significantPeopleInput
  );
  const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    meaningfulLocationsInput
  );
  const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    treasuredPossessionsInput
  );

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}
