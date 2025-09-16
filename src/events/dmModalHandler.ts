import {
  type ModalSubmitInteraction,
  type ButtonInteraction,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { queryCollection } from "../config/db.js";

// Database interfaces (duplicated from dm.ts for now)
interface CustomNPC {
  _id?: any;
  guildId: string;
  name: string;
  characteristics: {
    STR: number;
    DEX: number;
    INT: number;
    CON: number;
    APP: number;
    POW: number;
    SIZ: number;
    EDU: number;
  };
  hitPoints: number;
  sanity?: number;
  skills: { [key: string]: number };
  weapons?: Array<{
    name: string;
    skill: string;
    damage: string;
    range?: string;
  }>;
  description?: string;
  privateNotes?: string;
  createdBy: string;
  createdAt: Date;
}

interface CustomEncounter {
  _id?: any;
  guildId: string;
  name: string;
  location: string;
  description: string;
  privateNotes?: string;
  npcs?: string[];
  requirements?: string;
  rewards?: string;
  createdBy: string;
  createdAt: Date;
}

export async function handleDMModalSubmit(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;

  if (customId.startsWith("create_npc_step1_")) {
    await handleNPCStep1Submit(interaction);
  } else if (customId.startsWith("create_npc_step2_")) {
    await handleNPCStep2Submit(interaction);
  } else if (customId.startsWith("create_npc_")) {
    await handleNPCModalSubmit(interaction);
  } else if (customId.startsWith("create_encounter_")) {
    await handleEncounterModalSubmit(interaction);
  }
}

// Temporary storage for multi-step NPC creation
const npcCreationData = new Map<string, any>();

// Helper function to safely get text input values
function safeGetTextInput(
  interaction: ModalSubmitInteraction,
  customId: string,
  required: boolean = true
): string {
  try {
    console.log(`Attempting to get field: ${customId}`);
    const value = interaction.fields.getTextInputValue(customId);
    console.log(`Got value for ${customId}:`, value, typeof value);

    // Basic validation - just check if it's a string and not empty if required
    if (typeof value !== "string") {
      throw new Error(`Field '${customId}' is not a string`);
    }
    if (required && value.trim().length === 0) {
      throw new Error(`Field '${customId}' is required but empty`);
    }
    return value;
  } catch (error) {
    console.error(`Error getting field ${customId}:`, error);
    if (required) {
      throw new Error(
        `Failed to get required field '${customId}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    return "";
  }
}

async function handleNPCStep1Submit(interaction: ModalSubmitInteraction) {
  const npcName = interaction.customId.replace("create_npc_step1_", "");

  try {
    // Safely get text input values with proper error handling
    console.log("Getting STR value...");
    const STR = parseInt(safeGetTextInput(interaction, "STR"));
    console.log("Getting DEX value...");
    const DEX = parseInt(safeGetTextInput(interaction, "DEX"));
    console.log("Getting INT value...");
    const INT = parseInt(safeGetTextInput(interaction, "INT"));
    console.log("Getting CON value...");
    const CON = parseInt(safeGetTextInput(interaction, "CON"));
    console.log("Getting APP value...");
    const APP = parseInt(safeGetTextInput(interaction, "APP"));

    const characteristics = [STR, DEX, INT, CON, APP];

    // Validate all characteristics
    for (const char of characteristics) {
      if (isNaN(char) || char < 1 || char > 100) {
        await interaction.reply({
          content: "❌ All characteristics must be numbers between 1 and 100.",
          ephemeral: true,
        });
        return;
      }
    }

    // Store step 1 data temporarily
    const userId = interaction.user.id;
    npcCreationData.set(`${userId}_${npcName}`, {
      name: npcName,
      STR,
      DEX,
      INT,
      CON,
      APP,
      guildId: interaction.guildId!,
      createdBy: userId,
    });

    // Show step 2 modal for remaining characteristics
    const modal = new ModalBuilder()
      .setCustomId(`create_npc_step2_${npcName}`)
      .setTitle(`Create NPC: ${npcName} - Step 2/2`);

    const powInput = new TextInputBuilder()
      .setCustomId("POW")
      .setLabel("Power (POW)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("60")
      .setRequired(true);

    const sizInput = new TextInputBuilder()
      .setCustomId("SIZ")
      .setLabel("Size (SIZ)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("65")
      .setRequired(true);

    const eduInput = new TextInputBuilder()
      .setCustomId("EDU")
      .setLabel("Education (EDU)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("70")
      .setRequired(true);

    const skillsInput = new TextInputBuilder()
      .setCustomId("skills")
      .setLabel("Skills (format: skill name:value, skill name:value)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("spot hidden:65, psychology:50, fighting (brawl):45")
      .setRequired(false);

    const descriptionInput = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Public Description (what players see)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("A mysterious figure in dark robes...")
      .setRequired(false);

    const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      powInput
    );
    const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      sizInput
    );
    const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      eduInput
    );
    const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      skillsInput
    );
    const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      descriptionInput
    );

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    // We can't show a modal in response to a modal submit, so we'll store the data and send a follow-up button
    await interaction.reply({
      content: `✅ **Step 1 Complete** - Characteristics STR-APP saved!\n\n🎯 **Next:** Click the button below to continue with POW, SIZ, EDU, skills, and description.`,
      components: [
        new ActionRowBuilder<any>().addComponents(
          new ButtonBuilder()
            .setCustomId(`npc_step2_${npcName}`)
            .setLabel("Continue to Step 2")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("➡️")
        ),
      ],
      ephemeral: true,
    });
  } catch (error) {
    console.error("NPC Step 1 error:", error);
    await interaction.reply({
      content: `❌ Error processing characteristics. Please ensure:\n• All fields contain valid numbers (1-100)\n• No special characters or text\n• Each field has a value\n\nError: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      ephemeral: true,
    });
  }
}

async function handleNPCStep2Submit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const npcName = interaction.customId.replace("create_npc_step2_", "");
  const userId = interaction.user.id;
  const storedData = npcCreationData.get(`${userId}_${npcName}`);

  if (!storedData) {
    await interaction.editReply({
      content:
        "❌ NPC creation session expired. Please start over with `/dm create-npc`.",
    });
    return;
  }

  try {
    // Safely get text input values with proper error handling
    const POW = parseInt(safeGetTextInput(interaction, "POW"));
    const SIZ = parseInt(safeGetTextInput(interaction, "SIZ"));
    const EDU = parseInt(safeGetTextInput(interaction, "EDU"));

    const remainingChars = [POW, SIZ, EDU];

    // Validate remaining characteristics
    for (const char of remainingChars) {
      if (isNaN(char) || char < 1 || char > 100) {
        await interaction.editReply({
          content: "❌ All characteristics must be numbers between 1 and 100.",
        });
        return;
      }
    }

    // Safely get optional text fields
    const skillsInput = safeGetTextInput(interaction, "skills", false);
    const description = safeGetTextInput(interaction, "description", false);

    // Parse skills
    const skills: { [key: string]: number } = {};
    if (skillsInput.trim()) {
      const skillPairs = skillsInput.split(",");
      for (const pair of skillPairs) {
        const [skillName, skillValue] = pair.split(":").map((s) => s.trim());
        if (skillName && skillValue) {
          const value = parseInt(skillValue);
          if (!isNaN(value) && value >= 0 && value <= 100) {
            skills[skillName.toLowerCase()] = value;
          }
        }
      }
    }

    // Combine all characteristics
    const characteristics = {
      STR: storedData.STR,
      DEX: storedData.DEX,
      INT: storedData.INT,
      CON: storedData.CON,
      APP: storedData.APP,
      POW,
      SIZ,
      EDU,
    };

    // Calculate derived attributes
    const hitPoints = Math.floor(
      (characteristics.CON + characteristics.SIZ) / 10
    );
    const sanity = characteristics.POW;

    // Create NPC object
    const newNPC: CustomNPC = {
      guildId: storedData.guildId,
      name: npcName,
      characteristics,
      hitPoints,
      sanity,
      skills,
      description: description || undefined,
      createdBy: storedData.createdBy,
      createdAt: new Date(),
    };

    // Save to database
    await queryCollection("dm_npcs", async (collection) => {
      await collection.insertOne(newNPC as any);
    });

    // Clean up temporary data
    npcCreationData.delete(`${userId}_${npcName}`);

    // Calculate damage bonus for display
    const damageBonus = calculateDamageBonus(
      characteristics.STR,
      characteristics.SIZ
    );

    // Success message
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`✅ NPC Created: ${npcName}`)
      .setDescription("Your custom NPC has been successfully created!")
      .addFields(
        {
          name: "Characteristics",
          value: `STR: ${characteristics.STR} | DEX: ${characteristics.DEX} | INT: ${characteristics.INT} | CON: ${characteristics.CON}\nAPP: ${characteristics.APP} | POW: ${characteristics.POW} | SIZ: ${characteristics.SIZ} | EDU: ${characteristics.EDU}`,
          inline: false,
        },
        {
          name: "Derived Attributes",
          value: `❤️ HP: ${hitPoints} | 🧠 Sanity: ${sanity} | 💪 DB: ${damageBonus}`,
          inline: false,
        }
      );

    if (Object.keys(skills).length > 0) {
      const skillsList = Object.entries(skills)
        .map(([skill, value]) => `${skill}: ${value}%`)
        .join(", ");
      embed.addFields({
        name: "Skills",
        value:
          skillsList.length > 1024
            ? skillsList.substring(0, 1021) + "..."
            : skillsList,
        inline: false,
      });
    }

    embed.setFooter({
      text: "Use /dm show-npc to display this NPC to players",
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error creating NPC:", error);
    await interaction.editReply({
      content: `❌ Error creating NPC: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
}

async function handleNPCModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const npcName = interaction.customId.replace("create_npc_", "");
  const characteristicsInput =
    interaction.fields.getTextInputValue("characteristics");
  const skillsInput = interaction.fields.getTextInputValue("skills") || "";
  const description = interaction.fields.getTextInputValue("description") || "";
  const privateNotes =
    interaction.fields.getTextInputValue("private_notes") || "";

  try {
    // Parse characteristics
    const charArray = characteristicsInput
      .split(",")
      .map((s) => parseInt(s.trim()));
    if (charArray.length !== 8 || charArray.some(isNaN)) {
      throw new Error("Characteristics must be 8 comma-separated numbers");
    }

    const [STR, DEX, INT, CON, APP, POW, SIZ, EDU] = charArray;

    // Validate characteristic ranges
    for (const char of charArray) {
      if (char < 1 || char > 100) {
        throw new Error("Characteristics must be between 1 and 100");
      }
    }

    // Parse skills
    const skills: { [key: string]: number } = {};
    if (skillsInput.trim()) {
      const skillPairs = skillsInput.split(",");
      for (const pair of skillPairs) {
        const [skillName, skillValue] = pair.split(":").map((s) => s.trim());
        if (skillName && skillValue) {
          const value = parseInt(skillValue);
          if (!isNaN(value) && value >= 0 && value <= 100) {
            skills[skillName.toLowerCase()] = value;
          }
        }
      }
    }

    // Calculate derived attributes
    const hitPoints = Math.floor((CON + SIZ) / 10);
    const sanity = POW;

    // Create NPC object
    const newNPC: CustomNPC = {
      guildId: interaction.guildId!,
      name: npcName,
      characteristics: { STR, DEX, INT, CON, APP, POW, SIZ, EDU },
      hitPoints,
      sanity,
      skills,
      description: description || undefined,
      privateNotes: privateNotes || undefined,
      createdBy: interaction.user.id,
      createdAt: new Date(),
    };

    // Save to database
    await queryCollection("dm_npcs", async (collection) => {
      await collection.insertOne(newNPC as any);
    });

    // Calculate damage bonus for display
    const damageBonus = calculateDamageBonus(STR, SIZ);

    // Success message
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`✅ NPC Created: ${npcName}`)
      .setDescription("Your custom NPC has been successfully created!")
      .addFields(
        {
          name: "Characteristics",
          value: `STR: ${STR} | DEX: ${DEX} | INT: ${INT} | CON: ${CON}\nAPP: ${APP} | POW: ${POW} | SIZ: ${SIZ} | EDU: ${EDU}`,
          inline: false,
        },
        {
          name: "Derived Attributes",
          value: `❤️ HP: ${hitPoints} | 🧠 Sanity: ${sanity} | 💪 DB: ${damageBonus}`,
          inline: false,
        }
      );

    if (Object.keys(skills).length > 0) {
      const skillsList = Object.entries(skills)
        .map(([skill, value]) => `${skill}: ${value}%`)
        .join(", ");
      embed.addFields({
        name: "Skills",
        value:
          skillsList.length > 1024
            ? skillsList.substring(0, 1021) + "..."
            : skillsList,
        inline: false,
      });
    }

    embed.setFooter({
      text: "Use /dm show-npc to display this NPC to players",
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error creating NPC:", error);
    await interaction.editReply({
      content: `❌ Error creating NPC: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\n**Format examples:**\n• Characteristics: \`50,60,70,55,45,65,60,75\` (STR,DEX,INT,CON,APP,POW,SIZ,EDU)\n• Skills: \`spot hidden:65,psychology:50,fighting (brawl):45\``,
    });
  }
}

async function handleEncounterModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const encounterName = interaction.customId.replace("create_encounter_", "");
  const location = interaction.fields.getTextInputValue("location");
  const description = interaction.fields.getTextInputValue("description");
  const requirements =
    interaction.fields.getTextInputValue("requirements") || "";
  const rewards = interaction.fields.getTextInputValue("rewards") || "";
  const privateNotes =
    interaction.fields.getTextInputValue("private_notes") || "";

  try {
    // Create encounter object
    const newEncounter: CustomEncounter = {
      guildId: interaction.guildId!,
      name: encounterName,
      location,
      description,
      requirements: requirements || undefined,
      rewards: rewards || undefined,
      privateNotes: privateNotes || undefined,
      createdBy: interaction.user.id,
      createdAt: new Date(),
    };

    // Save to database
    await queryCollection("dm_encounters", async (collection) => {
      await collection.insertOne(newEncounter as any);
    });

    // Success message
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`✅ Encounter Created: ${encounterName}`)
      .setDescription("Your custom encounter has been successfully created!")
      .addFields(
        {
          name: "📍 Location",
          value: location,
          inline: false,
        },
        {
          name: "📖 Description",
          value:
            description.length > 1024
              ? description.substring(0, 1021) + "..."
              : description,
          inline: false,
        }
      );

    if (requirements) {
      embed.addFields({
        name: "🎲 Requirements/Skill Checks",
        value:
          requirements.length > 1024
            ? requirements.substring(0, 1021) + "..."
            : requirements,
        inline: false,
      });
    }

    if (rewards) {
      embed.addFields({
        name: "🏆 Rewards & Outcomes",
        value:
          rewards.length > 1024 ? rewards.substring(0, 1021) + "..." : rewards,
        inline: false,
      });
    }

    embed.setFooter({
      text: "Use /dm spawn-encounter to trigger this encounter",
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Error creating encounter:", error);
    await interaction.editReply({
      content: `❌ Error creating encounter: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
}

function calculateDamageBonus(str: number, siz: number): string {
  const combined = str + siz;

  if (combined <= 64) return "-2";
  if (combined <= 84) return "-1";
  if (combined <= 124) return "0";
  if (combined <= 164) return "+1d4";
  if (combined <= 204) return "+1d6";
  if (combined <= 284) return "+2d6";
  if (combined <= 364) return "+3d6";
  if (combined <= 444) return "+4d6";

  return "+5d6";
}

export async function handleNPCStep2Button(interaction: ButtonInteraction) {
  const npcName = interaction.customId.replace("npc_step2_", "");
  const userId = interaction.user.id;
  const storedData = npcCreationData.get(`${userId}_${npcName}`);

  if (!storedData) {
    await interaction.reply({
      content:
        "❌ NPC creation session expired. Please start over with `/dm create-npc`.",
      ephemeral: true,
    });
    return;
  }

  // Create modal for step 2
  const modal = new ModalBuilder()
    .setCustomId(`create_npc_step2_${npcName}`)
    .setTitle(`Create NPC: ${npcName} - Step 2/2`);

  const powInput = new TextInputBuilder()
    .setCustomId("POW")
    .setLabel("Power (POW)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("60")
    .setRequired(true);

  const sizInput = new TextInputBuilder()
    .setCustomId("SIZ")
    .setLabel("Size (SIZ)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("65")
    .setRequired(true);

  const eduInput = new TextInputBuilder()
    .setCustomId("EDU")
    .setLabel("Education (EDU)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("70")
    .setRequired(true);

  const skillsInput = new TextInputBuilder()
    .setCustomId("skills")
    .setLabel("Skills (format: skill name:value, skill name:value)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("spot hidden:65, psychology:50, fighting (brawl):45")
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Public Description (what players see)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("A mysterious figure in dark robes...")
    .setRequired(false);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    powInput
  );
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    sizInput
  );
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    eduInput
  );
  const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    skillsInput
  );
  const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    descriptionInput
  );

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}
