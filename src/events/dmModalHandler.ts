import {
  type ModalSubmitInteraction,
  EmbedBuilder,
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

  if (customId.startsWith("create_npc_")) {
    await handleNPCModalSubmit(interaction);
  } else if (customId.startsWith("create_encounter_")) {
    await handleEncounterModalSubmit(interaction);
  }
}

async function handleNPCModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const npcName = interaction.customId.replace("create_npc_", "");
  const characteristicsInput = interaction.fields.getTextInputValue("characteristics");
  const skillsInput = interaction.fields.getTextInputValue("skills") || "";
  const description = interaction.fields.getTextInputValue("description") || "";
  const privateNotes = interaction.fields.getTextInputValue("private_notes") || "";

  try {
    // Parse characteristics
    const charArray = characteristicsInput.split(",").map(s => parseInt(s.trim()));
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
        const [skillName, skillValue] = pair.split(":").map(s => s.trim());
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
        value: skillsList.length > 1024 ? skillsList.substring(0, 1021) + "..." : skillsList,
        inline: false,
      });
    }

    embed.setFooter({ text: "Use /dm show-npc to display this NPC to players" });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error creating NPC:", error);
    await interaction.editReply({
      content: `❌ Error creating NPC: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Format examples:**\n• Characteristics: \`50,60,70,55,45,65,60,75\`\n• Skills: \`spot hidden:65,psychology:50,fighting (brawl):45\``
    });
  }
}

async function handleEncounterModalSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const encounterName = interaction.customId.replace("create_encounter_", "");
  const location = interaction.fields.getTextInputValue("location");
  const description = interaction.fields.getTextInputValue("description");
  const requirements = interaction.fields.getTextInputValue("requirements") || "";
  const privateNotes = interaction.fields.getTextInputValue("private_notes") || "";

  try {
    // Create encounter object
    const newEncounter: CustomEncounter = {
      guildId: interaction.guildId!,
      name: encounterName,
      location,
      description,
      requirements: requirements || undefined,
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
          value: description.length > 1024 ? description.substring(0, 1021) + "..." : description,
          inline: false,
        }
      );

    if (requirements) {
      embed.addFields({
        name: "🎲 Requirements/Skill Checks",
        value: requirements.length > 1024 ? requirements.substring(0, 1021) + "..." : requirements,
        inline: false,
      });
    }

    embed.setFooter({ text: "Use /dm spawn-encounter to trigger this encounter" });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error creating encounter:", error);
    await interaction.editReply({
      content: `❌ Error creating encounter: ${error instanceof Error ? error.message : "Unknown error"}`
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