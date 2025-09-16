import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";
import { DiceRoller } from "../features/dice.js";
import { queryCollection } from "../config/db.js";

// Database interfaces
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
  npcs?: string[]; // NPC IDs
  requirements?: string;
  rewards?: string;
  createdBy: string;
  createdAt: Date;
}

// NPC stat block template
interface NPCStats {
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
}

// Predefined NPC templates
const NPC_TEMPLATES: { [key: string]: Partial<NPCStats> } = {
  cultist: {
    characteristics: { STR: 50, DEX: 60, INT: 55, CON: 60, APP: 50, POW: 70, SIZ: 65, EDU: 40 },
    skills: {
      "spot hidden": 45,
      "listen": 50,
      "psychology": 35,
      "occult": 60,
      "dodge": 30,
      "firearms (handgun)": 40,
      "fighting (brawl)": 50
    },
    weapons: [
      { name: "Knife", skill: "fighting (brawl)", damage: "1d4+db" },
      { name: "Revolver", skill: "firearms (handgun)", damage: "1d10" }
    ]
  },
  investigator: {
    characteristics: { STR: 65, DEX: 70, INT: 75, CON: 65, APP: 60, POW: 60, SIZ: 60, EDU: 80 },
    skills: {
      "spot hidden": 70,
      "listen": 65,
      "psychology": 60,
      "library use": 75,
      "history": 60,
      "dodge": 35,
      "firearms (handgun)": 50,
      "fighting (brawl)": 60
    },
    weapons: [
      { name: "Pistol", skill: "firearms (handgun)", damage: "1d10" },
      { name: "Fist", skill: "fighting (brawl)", damage: "1d3+db" }
    ]
  },
  monster: {
    characteristics: { STR: 85, DEX: 40, INT: 30, CON: 80, APP: 10, POW: 75, SIZ: 90, EDU: 20 },
    skills: {
      "spot hidden": 60,
      "listen": 70,
      "dodge": 20,
      "fighting (brawl)": 70
    },
    weapons: [
      { name: "Claws", skill: "fighting (brawl)", damage: "1d6+db" },
      { name: "Bite", skill: "fighting (brawl)", damage: "1d8+db" }
    ]
  }
};

// Role name that can use DM commands - customize this as needed
const DM_ROLE_NAME = "DM"; // Change this to your desired role name

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Dungeon Master tools for Call of Cthulhu")
    .addSubcommand(subcommand =>
      subcommand
        .setName("npc")
        .setDescription("Generate an NPC with stats")
        .addStringOption(option =>
          option
            .setName("type")
            .setDescription("Type of NPC to generate")
            .setRequired(true)
            .addChoices(
              { name: "Cultist", value: "cultist" },
              { name: "Investigator", value: "investigator" },
              { name: "Monster/Creature", value: "monster" },
              { name: "Custom", value: "custom" }
            )
        )
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("NPC name")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Brief description of the NPC")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("roll")
        .setDescription("Make a skill roll for an NPC or situation")
        .addStringOption(option =>
          option
            .setName("dice")
            .setDescription("Dice expression (e.g., 1d100, 2d6+3)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Description of what's being rolled")
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName("hidden")
            .setDescription("Make this roll hidden from players")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("sanity")
        .setDescription("Apply sanity loss to multiple players")
        .addStringOption(option =>
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
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Description of what caused the sanity loss")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("weather")
        .setDescription("Generate weather conditions for the scenario")
        .addStringOption(option =>
          option
            .setName("season")
            .setDescription("Season of the year")
            .setRequired(false)
            .addChoices(
              { name: "Spring", value: "spring" },
              { name: "Summer", value: "summer" },
              { name: "Autumn/Fall", value: "autumn" },
              { name: "Winter", value: "winter" }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("chase")
        .setDescription("Initialize a chase sequence")
        .addStringOption(option =>
          option
            .setName("type")
            .setDescription("Type of chase")
            .setRequired(true)
            .addChoices(
              { name: "Vehicle Chase", value: "vehicle" },
              { name: "Foot Chase", value: "foot" },
              { name: "Boat Chase", value: "boat" }
            )
        )
        .addIntegerOption(option =>
          option
            .setName("participants")
            .setDescription("Number of participants in the chase")
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("encounter")
        .setDescription("Generate a random encounter")
        .addStringOption(option =>
          option
            .setName("location")
            .setDescription("Location type for the encounter")
            .setRequired(false)
            .addChoices(
              { name: "Urban", value: "urban" },
              { name: "Rural", value: "rural" },
              { name: "Wilderness", value: "wilderness" },
              { name: "Library/Archive", value: "library" },
              { name: "Hospital/Asylum", value: "hospital" },
              { name: "Cemetery", value: "cemetery" }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("create-npc")
        .setDescription("Create a custom NPC with manual stats")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("NPC name")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list-npcs")
        .setDescription("List all custom NPCs")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("show-npc")
        .setDescription("Display an NPC to players (public info only)")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("NPC name")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("create-encounter")
        .setDescription("Create a custom encounter")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Encounter name")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list-encounters")
        .setDescription("List all custom encounters")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("spawn-encounter")
        .setDescription("Trigger a custom encounter (shows public info)")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Encounter name")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("npc-roll")
        .setDescription("Roll dice for an NPC using their stats")
        .addStringOption(option =>
          option
            .setName("npc")
            .setDescription("NPC name")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("skill")
            .setDescription("Skill or characteristic to roll against")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("difficulty")
            .setDescription("Difficulty level")
            .setRequired(false)
            .addChoices(
              { name: "Normal", value: "normal" },
              { name: "Hard", value: "hard" },
              { name: "Extreme", value: "extreme" }
            )
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Description of what the NPC is attempting")
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName("hidden")
            .setDescription("Hide the roll from players")
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user has the required role
    if (!interaction.member || !interaction.guild) {
      await interaction.reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    const hasRole = Array.isArray(member.roles)
      ? member.roles.includes(DM_ROLE_NAME)
      : member.roles.cache.some(role => role.name === DM_ROLE_NAME);

    if (!hasRole) {
      await interaction.reply({
        content: `❌ You need the **${DM_ROLE_NAME}** role to use DM commands.`,
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "npc":
        await handleNPCGeneration(interaction);
        break;
      case "roll":
        await handleDMRoll(interaction);
        break;
      case "sanity":
        await handleMassSanityLoss(interaction);
        break;
      case "weather":
        await handleWeatherGeneration(interaction);
        break;
      case "chase":
        await handleChaseSequence(interaction);
        break;
      case "encounter":
        await handleEncounterGeneration(interaction);
        break;
      case "create-npc":
        await handleCreateCustomNPC(interaction);
        break;
      case "list-npcs":
        await handleListNPCs(interaction);
        break;
      case "show-npc":
        await handleShowNPC(interaction);
        break;
      case "create-encounter":
        await handleCreateCustomEncounter(interaction);
        break;
      case "list-encounters":
        await handleListEncounters(interaction);
        break;
      case "spawn-encounter":
        await handleSpawnEncounter(interaction);
        break;
      case "npc-roll":
        await handleNPCRoll(interaction);
        break;
    }
  },
};

async function handleNPCGeneration(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const type = interaction.options.getString("type", true);
  const name = interaction.options.getString("name", true);
  const description = interaction.options.getString("description");

  let npcStats: NPCStats;

  if (type === "custom") {
    // Generate random stats for custom NPC
    npcStats = {
      name,
      characteristics: {
        STR: DiceRoller.rollDice("3d6").total * 5,
        DEX: DiceRoller.rollDice("3d6").total * 5,
        INT: DiceRoller.rollDice("3d6").total * 5,
        CON: DiceRoller.rollDice("3d6").total * 5,
        APP: DiceRoller.rollDice("3d6").total * 5,
        POW: DiceRoller.rollDice("3d6").total * 5,
        SIZ: DiceRoller.rollDice("3d6").total * 5,
        EDU: DiceRoller.rollDice("3d6").total * 5,
      },
      hitPoints: 0,
      skills: {},
      description: description || undefined
    };
  } else {
    const template = NPC_TEMPLATES[type];
    npcStats = {
      name,
      characteristics: template.characteristics!,
      hitPoints: 0,
      skills: template.skills!,
      weapons: template.weapons,
      description: description || undefined
    };
  }

  // Calculate derived attributes
  const con = npcStats.characteristics.CON;
  const siz = npcStats.characteristics.SIZ;
  const pow = npcStats.characteristics.POW;

  npcStats.hitPoints = Math.floor((con + siz) / 10);
  npcStats.sanity = pow;

  // Calculate damage bonus
  const str = npcStats.characteristics.STR;
  const damageBonus = calculateDamageBonus(str, siz);

  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(`👤 ${npcStats.name}`)
    .setDescription(description || `A ${type} NPC`)
    .addFields(
      {
        name: "Characteristics",
        value: `STR: ${npcStats.characteristics.STR} | DEX: ${npcStats.characteristics.DEX} | INT: ${npcStats.characteristics.INT} | CON: ${npcStats.characteristics.CON}\nAPP: ${npcStats.characteristics.APP} | POW: ${npcStats.characteristics.POW} | SIZ: ${npcStats.characteristics.SIZ} | EDU: ${npcStats.characteristics.EDU}`,
        inline: false,
      },
      {
        name: "Derived Attributes",
        value: `❤️ HP: ${npcStats.hitPoints} | 🧠 Sanity: ${npcStats.sanity} | 💪 DB: ${damageBonus}`,
        inline: false,
      }
    );

  // Add skills if present
  if (Object.keys(npcStats.skills).length > 0) {
    const skillsList = Object.entries(npcStats.skills)
      .map(([skill, value]) => `${skill}: ${value}%`)
      .join(", ");
    embed.addFields({
      name: "Notable Skills",
      value: skillsList,
      inline: false,
    });
  }

  // Add weapons if present
  if (npcStats.weapons && npcStats.weapons.length > 0) {
    const weaponsList = npcStats.weapons
      .map(weapon => `**${weapon.name}** (${weapon.skill}): ${weapon.damage}${weapon.range ? ` | Range: ${weapon.range}` : ''}`)
      .join("\n");
    embed.addFields({
      name: "⚔️ Weapons & Attacks",
      value: weaponsList,
      inline: false,
    });
  }

  embed.setFooter({ text: "Generated by DM Tools" }).setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleDMRoll(interaction: ChatInputCommandInteraction) {
  const diceExpression = interaction.options.getString("dice", true);
  const description = interaction.options.getString("description");
  const hidden = interaction.options.getBoolean("hidden") ?? true; // Default to hidden

  await interaction.deferReply({ ephemeral: hidden });

  try {
    const result = DiceRoller.rollDice(diceExpression);

    let output = `🎲 **DM Roll${description ? `: ${description}` : ''}**\n`;
    output += `Expression: \`${diceExpression}\`\n`;
    output += `Result: **${result.total}**`;

    if (result.rolls.length > 1) {
      output += ` (${result.rolls.join(" + ")})`;
    }

    if (hidden) {
      output = `🔒 ${output}\n\n*This roll is hidden from players*`;
    }

    await interaction.editReply(output);
  } catch (error) {
    await interaction.editReply({
      content: `❌ Invalid dice expression: \`${diceExpression}\`\n\nExample formats: \`1d100\`, \`2d6+3\`, \`1d8+1d4\``
    });
  }
}

async function handleMassSanityLoss(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // This one should be public

  const severity = interaction.options.getString("severity", true);
  const description = interaction.options.getString("description", true);

  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle("🧠 Mass Sanity Event")
    .setDescription(`**Event:** ${description}\n**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}`)
    .addFields({
      name: "Instructions for Players",
      value: `All players who witnessed this event should use:\n\`/sanity ${severity} ${description}\`\n\nThis will automatically calculate and apply sanity loss based on your individual rolls.`,
      inline: false,
    })
    .setFooter({ text: "Each player must roll individually" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleWeatherGeneration(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // This one should be public

  const season = interaction.options.getString("season");

  const weatherConditions = {
    spring: ["Light rain", "Overcast", "Mild and clear", "Windy", "Morning mist", "Cool breeze"],
    summer: ["Hot and humid", "Thunderstorm", "Clear skies", "Sweltering heat", "Light breeze", "Partly cloudy"],
    autumn: ["Foggy", "Crisp and clear", "Light drizzle", "Windy", "Overcast", "Cold rain"],
    winter: ["Snow", "Freezing rain", "Clear and cold", "Blizzard", "Overcast and cold", "Frost"]
  };

  const temperatures = {
    spring: ["Cool", "Mild", "Pleasant", "Chilly"],
    summer: ["Warm", "Hot", "Sweltering", "Humid"],
    autumn: ["Cool", "Crisp", "Cold", "Brisk"],
    winter: ["Cold", "Freezing", "Bitter", "Harsh"]
  };

  let selectedSeason = season;
  if (!selectedSeason) {
    const seasons = ["spring", "summer", "autumn", "winter"];
    selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
  }

  const conditions = weatherConditions[selectedSeason as keyof typeof weatherConditions];
  const temps = temperatures[selectedSeason as keyof typeof temperatures];

  const weather = conditions[Math.floor(Math.random() * conditions.length)];
  const temperature = temps[Math.floor(Math.random() * temps.length)];

  // Generate additional atmospheric details
  const visibility = ["Clear", "Slightly hazy", "Poor", "Excellent"][Math.floor(Math.random() * 4)];
  const windSpeed = ["Calm", "Light breeze", "Moderate wind", "Strong wind"][Math.floor(Math.random() * 4)];

  const embed = new EmbedBuilder()
    .setColor(0x4a90e2)
    .setTitle("🌤️ Weather Conditions")
    .addFields(
      { name: "Season", value: selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1), inline: true },
      { name: "Conditions", value: weather, inline: true },
      { name: "Temperature", value: temperature, inline: true },
      { name: "Visibility", value: visibility, inline: true },
      { name: "Wind", value: windSpeed, inline: true },
      { name: "\u200b", value: "\u200b", inline: true }
    )
    .setFooter({ text: "Weather can affect skill checks and movement" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleChaseSequence(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // This one should be public

  const chaseType = interaction.options.getString("type", true);
  const participants = interaction.options.getInteger("participants") || 4;

  const chaseRules = {
    vehicle: {
      skill: "Drive Auto",
      hazards: ["Sharp turn", "Obstacle in road", "Traffic", "Mechanical failure", "Police intervention"],
      description: "Use Drive Auto skill for maneuvers"
    },
    foot: {
      skill: "Athletics or CON roll",
      hazards: ["Obstacle to jump/climb", "Slippery surface", "Crowd of people", "Dead end", "Exhaustion"],
      description: "Use Athletics for agility, CON for endurance"
    },
    boat: {
      skill: "Pilot (Boat)",
      hazards: ["Rough waters", "Rocks/reef", "Other vessels", "Engine trouble", "Weather change"],
      description: "Use Pilot (Boat) skill for navigation"
    }
  };

  const rules = chaseRules[chaseType as keyof typeof chaseRules];
  const hazard = rules.hazards[Math.floor(Math.random() * rules.hazards.length)];

  const embed = new EmbedBuilder()
    .setColor(0xff6b35)
    .setTitle(`🏃 ${chaseType.charAt(0).toUpperCase() + chaseType.slice(1)} Chase Sequence`)
    .setDescription(`**Participants:** ${participants}\n**Primary Skill:** ${rules.skill}\n\n${rules.description}`)
    .addFields(
      {
        name: "Current Hazard",
        value: `⚠️ **${hazard}**\nAll participants must make appropriate skill checks to navigate this obstacle.`,
        inline: false,
      },
      {
        name: "Chase Mechanics",
        value: "• Roll initiative (DEX)\n• Each round, make skill checks\n• Success: Gain advantage or maintain position\n• Failure: Fall behind or face consequences\n• Extreme Success: Significant advantage\n• Fumble: Major setback or mishap",
        inline: false,
      }
    )
    .setFooter({ text: "DM determines success thresholds and consequences" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleEncounterGeneration(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply(); // This one should be public

  const location = interaction.options.getString("location") || "urban";

  const encounters = {
    urban: [
      "A street performer doing impossible tricks",
      "Homeless person with knowledge of local mysteries",
      "Police investigating a strange incident",
      "Suspicious individuals following the party",
      "News reporter seeking information",
      "Local historian with relevant knowledge"
    ],
    rural: [
      "Farmer reporting livestock disappearances",
      "Abandoned farmhouse with recent signs of activity",
      "Local sheriff investigating odd occurrences",
      "Strange lights seen in the fields",
      "Old-timer with local legends and stories",
      "Traveling salesman with unusual wares"
    ],
    wilderness: [
      "Hunter who found something he shouldn't have",
      "Park ranger reporting unusual animal behavior",
      "Hiking group that's been camping too long",
      "Strange markings on trees",
      "Abandoned research camp",
      "Local guide with knowledge of forbidden areas"
    ],
    library: [
      "Librarian protective of certain books",
      "Researcher studying similar topics",
      "Strange patron reading occult texts",
      "Missing books or torn pages",
      "Hidden room or secret collection",
      "Scholar who's gone slightly mad"
    ],
    hospital: [
      "Patient speaking in unknown languages",
      "Doctor conducting unusual experiments",
      "Nurse who's seen too much",
      "Medical records that don't make sense",
      "Abandoned wing with dark history",
      "Therapy session you overhear"
    ],
    cemetery: [
      "Groundskeeper with disturbing stories",
      "Midnight burial ceremony",
      "Vandalized or disturbed graves",
      "Mourner who visits every night",
      "Strange sounds from the mausoleums",
      "Fresh grave that shouldn't exist"
    ]
  };

  const locationEncounters = encounters[location as keyof typeof encounters];
  const encounter = locationEncounters[Math.floor(Math.random() * locationEncounters.length)];

  // Generate some additional context
  const timeOfDay = ["Early morning", "Mid-morning", "Afternoon", "Evening", "Night", "Late night"][Math.floor(Math.random() * 6)];
  const mood = ["Tense", "Mysterious", "Foreboding", "Curious", "Threatening", "Melancholic"][Math.floor(Math.random() * 6)];

  const embed = new EmbedBuilder()
    .setColor(0x6a5acd)
    .setTitle(`🎭 Random Encounter`)
    .addFields(
      { name: "Location", value: location.charAt(0).toUpperCase() + location.slice(1), inline: true },
      { name: "Time", value: timeOfDay, inline: true },
      { name: "Mood", value: mood, inline: true },
      {
        name: "Encounter",
        value: `**${encounter}**\n\n*Develop this encounter based on your scenario's needs and the party's current situation.*`,
        inline: false,
      },
      {
        name: "DM Notes",
        value: "• Consider how this ties to your main plot\n• What information might be gained?\n• Are there skill checks required?\n• Could this lead to further adventures?",
        inline: false,
      }
    )
    .setFooter({ text: "Adapt the encounter to fit your story" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
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

// Custom NPC Management Functions
async function handleCreateCustomNPC(interaction: ChatInputCommandInteraction) {
  const npcName = interaction.options.getString("name", true);

  // Check if NPC already exists
  const existingNPC = await queryCollection("dm_npcs", async (collection) => {
    return await collection.findOne({
      guildId: interaction.guildId!,
      name: { $regex: new RegExp(`^${npcName}$`, 'i') }
    });
  });

  if (existingNPC) {
    await interaction.reply({
      content: `❌ An NPC named "${npcName}" already exists in this server.`,
      ephemeral: true,
    });
    return;
  }

  // Create modal for characteristics (step 1 of 2)
  const modal = new ModalBuilder()
    .setCustomId(`create_npc_step1_${npcName}`)
    .setTitle(`Create NPC: ${npcName} - Step 1/2`);

  // Individual characteristic inputs
  const strInput = new TextInputBuilder()
    .setCustomId('STR')
    .setLabel('Strength (STR)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('50')
    .setRequired(true);

  const dexInput = new TextInputBuilder()
    .setCustomId('DEX')
    .setLabel('Dexterity (DEX)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('60')
    .setRequired(true);

  const intInput = new TextInputBuilder()
    .setCustomId('INT')
    .setLabel('Intelligence (INT)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('70')
    .setRequired(true);

  const conInput = new TextInputBuilder()
    .setCustomId('CON')
    .setLabel('Constitution (CON)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('65')
    .setRequired(true);

  const appInput = new TextInputBuilder()
    .setCustomId('APP')
    .setLabel('Appearance (APP)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('55')
    .setRequired(true);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(strInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dexInput);
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(intInput);
  const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(conInput);
  const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(appInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}

async function handleListNPCs(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const npcs = await queryCollection("dm_npcs", async (collection) => {
    return await collection.find({ guildId: interaction.guildId! })
      .sort({ createdAt: -1 })
      .toArray();
  });

  if (npcs.length === 0) {
    await interaction.editReply({
      content: "📝 No custom NPCs found. Use `/dm create-npc` to create one."
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle("📋 Custom NPCs")
    .setDescription(`Found ${npcs.length} custom NPC(s):`)
    .setFooter({ text: "Use /dm show-npc to display an NPC to players" })
    .setTimestamp();

  const npcList = npcs.map((npc, index) => {
    const hp = Math.floor((npc.characteristics.CON + npc.characteristics.SIZ) / 10);
    return `**${index + 1}.** ${npc.name} (HP: ${hp}, Created: <t:${Math.floor(npc.createdAt.getTime() / 1000)}:R>)`;
  }).join('\n');

  embed.addFields({
    name: "NPCs",
    value: npcList.length > 1024 ? npcList.substring(0, 1021) + "..." : npcList,
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleShowNPC(interaction: ChatInputCommandInteraction) {
  const npcName = interaction.options.getString("name", true);

  const npc = await queryCollection("dm_npcs", async (collection) => {
    return await collection.findOne({
      guildId: interaction.guildId!,
      name: { $regex: new RegExp(`^${npcName}$`, 'i') }
    });
  });

  if (!npc) {
    await interaction.reply({
      content: `❌ No NPC named "${npcName}" found. Use \`/dm list-npcs\` to see available NPCs.`,
      ephemeral: true,
    });
    return;
  }

  // Calculate derived attributes
  const hp = Math.floor((npc.characteristics.CON + npc.characteristics.SIZ) / 10);
  const sanity = npc.characteristics.POW;
  const damageBonus = calculateDamageBonus(npc.characteristics.STR, npc.characteristics.SIZ);

  // Public embed for players - only name and description
  const publicEmbed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(`👤 ${npc.name}`)
    .setDescription(npc.description || "A mysterious individual...")
    .setFooter({ text: "NPC Information" })
    .setTimestamp();

  // Private embed for DM
  const privateEmbed = new EmbedBuilder()
    .setColor(0x4a4a4a)
    .setTitle(`🔒 DM Notes - ${npc.name}`)
    .addFields(
      {
        name: "Characteristics",
        value: `STR: ${npc.characteristics.STR} | DEX: ${npc.characteristics.DEX} | INT: ${npc.characteristics.INT} | CON: ${npc.characteristics.CON}\nAPP: ${npc.characteristics.APP} | POW: ${npc.characteristics.POW} | SIZ: ${npc.characteristics.SIZ} | EDU: ${npc.characteristics.EDU}`,
        inline: false,
      },
      {
        name: "Derived Attributes",
        value: `❤️ HP: ${hp} | 🧠 Sanity: ${sanity} | 💪 DB: ${damageBonus}`,
        inline: false,
      }
    );

  // Add all skills to private view
  if (npc.skills && Object.keys(npc.skills).length > 0) {
    const allSkills = Object.entries(npc.skills)
      .map(([skill, value]) => `${skill}: ${value}%`)
      .join(", ");
    privateEmbed.addFields({
      name: "All Skills",
      value: allSkills.length > 1024 ? allSkills.substring(0, 1021) + "..." : allSkills,
      inline: false,
    });
  }

  if (npc.privateNotes) {
    privateEmbed.addFields({
      name: "Private Notes",
      value: npc.privateNotes.length > 1024 ? npc.privateNotes.substring(0, 1021) + "..." : npc.privateNotes,
      inline: false,
    });
  }

  // Send public message
  await interaction.reply({ embeds: [publicEmbed] });

  // Send private message to DM
  try {
    await interaction.followUp({
      embeds: [privateEmbed],
      ephemeral: true
    });
  } catch (error) {
    console.error("Error sending DM private info:", error);
  }
}

// Custom Encounter Management Functions
async function handleCreateCustomEncounter(interaction: ChatInputCommandInteraction) {
  const encounterName = interaction.options.getString("name", true);

  // Check if encounter already exists
  const existingEncounter = await queryCollection("dm_encounters", async (collection) => {
    return await collection.findOne({
      guildId: interaction.guildId!,
      name: { $regex: new RegExp(`^${encounterName}$`, 'i') }
    });
  });

  if (existingEncounter) {
    await interaction.reply({
      content: `❌ An encounter named "${encounterName}" already exists in this server.`,
      ephemeral: true,
    });
    return;
  }

  // Create modal for encounter creation
  const modal = new ModalBuilder()
    .setCustomId(`create_encounter_${encounterName}`)
    .setTitle(`Create Encounter: ${encounterName}`);

  // Location input
  const locationInput = new TextInputBuilder()
    .setCustomId('location')
    .setLabel('Location')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Abandoned warehouse, Cemetery, Library basement...')
    .setRequired(true);

  // Public description
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Public Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('What the players see and experience...')
    .setRequired(true);

  // Requirements input
  const requirementsInput = new TextInputBuilder()
    .setCustomId('requirements')
    .setLabel('Requirements/Skill Checks')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Spot Hidden 50+, Psychology Hard, Fighting (Brawl)...')
    .setRequired(false);

  // Rewards input
  const rewardsInput = new TextInputBuilder()
    .setCustomId('rewards')
    .setLabel('Rewards & Outcomes')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Experience points, clues, items, money, or story outcomes...')
    .setRequired(false);

  // Private notes
  const privateNotesInput = new TextInputBuilder()
    .setCustomId('private_notes')
    .setLabel('Private Notes & Secrets (DM only)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Hidden clues, alternative outcomes, NPC motivations...')
    .setRequired(false);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(locationInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(requirementsInput);
  const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(rewardsInput);
  const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(privateNotesInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}

async function handleListEncounters(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const encounters = await queryCollection("dm_encounters", async (collection) => {
    return await collection.find({ guildId: interaction.guildId! })
      .sort({ createdAt: -1 })
      .toArray();
  });

  if (encounters.length === 0) {
    await interaction.editReply({
      content: "📝 No custom encounters found. Use `/dm create-encounter` to create one."
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x6a5acd)
    .setTitle("📋 Custom Encounters")
    .setDescription(`Found ${encounters.length} custom encounter(s):`)
    .setFooter({ text: "Use /dm spawn-encounter to trigger an encounter" })
    .setTimestamp();

  const encounterList = encounters.map((encounter, index) => {
    return `**${index + 1}.** ${encounter.name}\n*Location: ${encounter.location}*\n*Created: <t:${Math.floor(encounter.createdAt.getTime() / 1000)}:R>*`;
  }).join('\n\n');

  embed.addFields({
    name: "Encounters",
    value: encounterList.length > 1024 ? encounterList.substring(0, 1021) + "..." : encounterList,
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSpawnEncounter(interaction: ChatInputCommandInteraction) {
  const encounterName = interaction.options.getString("name", true);

  const encounter = await queryCollection("dm_encounters", async (collection) => {
    return await collection.findOne({
      guildId: interaction.guildId!,
      name: { $regex: new RegExp(`^${encounterName}$`, 'i') }
    });
  });

  if (!encounter) {
    await interaction.reply({
      content: `❌ No encounter named "${encounterName}" found. Use \`/dm list-encounters\` to see available encounters.`,
      ephemeral: true,
    });
    return;
  }

  // Public embed for players - only name and description
  const publicEmbed = new EmbedBuilder()
    .setColor(0x6a5acd)
    .setTitle(`🎭 ${encounter.name}`)
    .setDescription(encounter.description)
    .setFooter({ text: "Encounter in Progress" })
    .setTimestamp();

  // Private embed for DM
  const privateEmbed = new EmbedBuilder()
    .setColor(0x4a4a4a)
    .setTitle(`🔒 DM Notes - ${encounter.name}`)
    .setDescription("Private information for this encounter:")
    .addFields(
      {
        name: "📍 Location",
        value: encounter.location,
        inline: false,
      }
    );

  if (encounter.requirements) {
    privateEmbed.addFields({
      name: "🎲 Requirements/Skill Checks",
      value: encounter.requirements,
      inline: false,
    });
  }

  if (encounter.privateNotes) {
    privateEmbed.addFields({
      name: "Private Notes",
      value: encounter.privateNotes.length > 1024 ? encounter.privateNotes.substring(0, 1021) + "..." : encounter.privateNotes,
      inline: false,
    });
  }

  if (encounter.rewards) {
    privateEmbed.addFields({
      name: "Rewards",
      value: encounter.rewards,
      inline: false,
    });
  }

  // Send public message
  await interaction.reply({ embeds: [publicEmbed] });

  // Send private message to DM
  try {
    await interaction.followUp({
      embeds: [privateEmbed],
      ephemeral: true
    });
  } catch (error) {
    console.error("Error sending DM private info:", error);
  }
}

async function handleNPCRoll(interaction: ChatInputCommandInteraction) {
  const npcName = interaction.options.getString("npc", true);
  const skillName = interaction.options.getString("skill", true);
  const difficulty = interaction.options.getString("difficulty") || "normal";
  const description = interaction.options.getString("description");
  const hidden = interaction.options.getBoolean("hidden") ?? true; // Default to hidden

  await interaction.deferReply({ ephemeral: hidden });

  // Find the NPC
  const npc = await queryCollection("dm_npcs", async (collection) => {
    return await collection.findOne({
      guildId: interaction.guildId!,
      name: { $regex: new RegExp(`^${npcName}$`, 'i') }
    });
  });

  if (!npc) {
    await interaction.editReply({
      content: `❌ No NPC named "${npcName}" found. Use \`/dm list-npcs\` to see available NPCs.`
    });
    return;
  }

  // Find the skill or characteristic value
  let targetValue: number | undefined;
  let rollType = "";

  // Check characteristics first (case-insensitive)
  const characteristicKeys = Object.keys(npc.characteristics);
  const matchedCharacteristic = characteristicKeys.find(key =>
    key.toLowerCase() === skillName.toLowerCase()
  );

  if (matchedCharacteristic) {
    targetValue = npc.characteristics[matchedCharacteristic as keyof typeof npc.characteristics];
    rollType = "characteristic";
  } else {
    // Check skills (case-insensitive)
    const skillKeys = Object.keys(npc.skills || {});
    const matchedSkill = skillKeys.find(key =>
      key.toLowerCase() === skillName.toLowerCase()
    );

    if (matchedSkill) {
      targetValue = npc.skills[matchedSkill];
      rollType = "skill";
    }
  }

  if (targetValue === undefined) {
    // List available skills and characteristics for help
    const availableCharacteristics = Object.keys(npc.characteristics).join(", ");
    const availableSkills = Object.keys(npc.skills || {}).join(", ");

    await interaction.editReply({
      content: `❌ "${skillName}" not found for ${npc.name}.\n\n**Available characteristics:** ${availableCharacteristics}\n**Available skills:** ${availableSkills || "None"}`
    });
    return;
  }

  // Apply difficulty modifiers
  let adjustedTarget = targetValue;
  let difficultyText = "";

  switch (difficulty) {
    case "hard":
      adjustedTarget = Math.floor(targetValue / 2);
      difficultyText = " (Hard)";
      break;
    case "extreme":
      adjustedTarget = Math.floor(targetValue / 5);
      difficultyText = " (Extreme)";
      break;
    case "normal":
    default:
      adjustedTarget = targetValue;
      difficultyText = "";
      break;
  }

  // Make the roll
  const result = DiceRoller.rollCoCSkill(adjustedTarget);

  // Format the result
  let output = `🎲 **${npc.name} - ${skillName}${difficultyText}**\n`;
  if (description) {
    output += `*${description}*\n\n`;
  }

  output += `**Target:** ${adjustedTarget}% | **Rolled:** ${result.total}\n\n`;

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

  // Add context about what was rolled
  output += `\n\n*${rollType === "characteristic" ? "Characteristic" : "Skill"}: ${skillName} (${targetValue}%)`;
  if (difficulty !== "normal") {
    output += ` → ${adjustedTarget}% after ${difficulty} difficulty`;
  }
  output += "*";

  if (hidden) {
    output = `🔒 ${output}\n\n*This roll is hidden from players*`;
  }

  await interaction.editReply({ content: output });
}