import { queryCollection } from "../config/db.js";

export interface CoCCharacter {
  userId: string;
  name: string;
  occupation: string;
  age: number;

  // Core characteristics (3d6 * 5 typically)
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

  // Derived attributes
  hitPoints: {
    current: number;
    maximum: number;
  };

  sanity: {
    current: number;
    maximum: number;
    starting: number;
  };

  luck: {
    current: number;
    starting: number;
  };

  magicPoints: {
    current: number;
    maximum: number;
  };

  // Movement and combat derived stats
  movementRate: number; // MOV: 7/8/9 based on STR/DEX/SIZ comparison
  damageBonus: string; // DB: damage bonus dice (e.g., "+1d4", "-1", "0")
  build: number; // Build: used for combat maneuvers

  // Personal details and backstory
  personalDescription: string;
  ideologyBeliefs: string;
  significantPeople: string;
  meaningfulLocations: string;
  treasuredPossessions: string;
  traits: string;
  encountersWithUnknown: string;

  // Skills - using standard CoC skill names
  skills: {
    // Investigation skills
    accounting: number;
    anthropology: number;
    appraise: number;
    archaeology: number;
    "art/craft": number;
    charm: number;
    climb: number;
    "credit rating": number;
    "cthulhu mythos": number;
    disguise: number;
    dodge: number;
    "drive auto": number;
    "electrical repair": number;
    "fast talk": number;
    "fighting (brawl)": number;
    "firearms (handgun)": number;
    "firearms (rifle/shotgun)": number;
    "first aid": number;
    history: number;
    intimidate: number;
    jump: number;
    "language (own)": number;
    law: number;
    "library use": number;
    listen: number;
    locksmith: number;
    "mechanical repair": number;
    medicine: number;
    "natural world": number;
    navigate: number;
    occult: number;
    "operate heavy machinery": number;
    persuade: number;
    pilot: number;
    psychology: number;
    psychoanalysis: number;
    ride: number;
    science: number;
    "sleight of hand": number;
    "spot hidden": number;
    stealth: number;
    survival: number;
    swim: number;
    throw: number;
    track: number;
    [key: string]: number; // Allow custom skills
  };

  // Languages (multiple entries allowed)
  languages: {
    [languageName: string]: number; // e.g., "French": 45, "German": 20
  };

  // Equipment and weapons
  weapons: Array<{
    name: string;
    skill: string; // which skill is used
    damage: string; // damage formula (e.g., "1d6+DB")
    range: string;
    attacksPerRound: number;
    ammo: number;
    malfunction: number;
  }>;

  equipment: string[]; // general equipment list
  armor: string; // armor description and protection value

  // Status tracking
  conditions: string[];
  injuries: string[];
  phobias: string[];
  manias: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Default skill values for new characters
const DEFAULT_SKILLS: Partial<CoCCharacter["skills"]> = {
  accounting: 5,
  anthropology: 1,
  appraise: 5,
  archaeology: 1,
  "art/craft": 5,
  charm: 15,
  climb: 20,
  "credit rating": 0,
  "cthulhu mythos": 0,
  disguise: 5,
  dodge: 0, // Half DEX
  "drive auto": 20,
  "electrical repair": 10,
  "fast talk": 5,
  "fighting (brawl)": 25,
  "firearms (handgun)": 20,
  "firearms (rifle/shotgun)": 25,
  "first aid": 30,
  history: 5,
  intimidate: 15,
  jump: 20,
  "language (own)": 0, // EDU value
  law: 5,
  "library use": 20,
  listen: 20,
  locksmith: 1,
  "mechanical repair": 10,
  medicine: 1,
  "natural world": 10,
  navigate: 10,
  occult: 5,
  "operate heavy machinery": 1,
  persuade: 10,
  pilot: 1,
  psychology: 10,
  psychoanalysis: 1,
  ride: 5,
  science: 1,
  "sleight of hand": 10,
  "spot hidden": 25,
  stealth: 20,
  survival: 10,
  swim: 20,
  throw: 20,
  track: 10,
};

// Calculate Movement Rate based on STR, DEX, SIZ
function calculateMovementRate(STR: number, DEX: number, SIZ: number): number {
  if (STR < SIZ && DEX < SIZ) return 7;
  if (STR > SIZ && DEX > SIZ) return 9;
  return 8; // One equals or one greater than SIZ
}

// Calculate Damage Bonus and Build from STR + SIZ
function calculateDamageBonusAndBuild(
  STR: number,
  SIZ: number
): { damageBonus: string; build: number } {
  const total = STR + SIZ;

  if (total <= 64) return { damageBonus: "-2", build: -2 };
  if (total <= 84) return { damageBonus: "-1", build: -1 };
  if (total <= 124) return { damageBonus: "0", build: 0 };
  if (total <= 164) return { damageBonus: "+1d4", build: 1 };
  if (total <= 204) return { damageBonus: "+1d6", build: 2 };
  if (total <= 284) return { damageBonus: "+2d6", build: 3 };
  if (total <= 364) return { damageBonus: "+3d6", build: 4 };
  if (total <= 444) return { damageBonus: "+4d6", build: 5 };

  // For very high values
  const extraDice = Math.floor((total - 204) / 80);
  return {
    damageBonus: `+${Math.min(extraDice + 1, 12)}d6`,
    build: Math.min(extraDice + 2, 13),
  };
}

export async function createCharacter(
  userId: string,
  name: string,
  occupation: string,
  age: number,
  characteristics: CoCCharacter["characteristics"]
): Promise<CoCCharacter> {
  // Calculate derived attributes
  const hitPoints = {
    current: Math.floor((characteristics.CON + characteristics.SIZ) / 10),
    maximum: Math.floor((characteristics.CON + characteristics.SIZ) / 10),
  };

  const sanity = {
    current: characteristics.POW,
    maximum: 99,
    starting: characteristics.POW,
  };

  const luck = {
    current: characteristics.POW,
    starting: characteristics.POW,
  };

  const magicPoints = {
    current: Math.floor(characteristics.POW / 5),
    maximum: Math.floor(characteristics.POW / 5),
  };

  // Calculate movement rate, damage bonus, and build
  const movementRate = calculateMovementRate(
    characteristics.STR,
    characteristics.DEX,
    characteristics.SIZ
  );
  const { damageBonus, build } = calculateDamageBonusAndBuild(
    characteristics.STR,
    characteristics.SIZ
  );

  // Set up skills with defaults and characteristic-based values
  const skills = { ...DEFAULT_SKILLS };
  skills["dodge"] = Math.floor(characteristics.DEX / 2);
  skills["language (own)"] = characteristics.EDU;

  // Default languages (just native language)
  const languages = {
    English: characteristics.EDU, // Assume English as default, could be customized
  };

  const character: CoCCharacter = {
    userId,
    name,
    occupation,
    age,
    characteristics,
    hitPoints,
    sanity,
    luck,
    magicPoints,
    movementRate,
    damageBonus,
    build,

    // Personal details (empty by default, can be filled later)
    personalDescription: "",
    ideologyBeliefs: "",
    significantPeople: "",
    meaningfulLocations: "",
    treasuredPossessions: "",
    traits: "",
    encountersWithUnknown: "",

    skills: skills as CoCCharacter["skills"],
    languages,
    weapons: [], // Empty array, weapons can be added later
    equipment: [], // Empty array, equipment can be added later
    armor: "", // No armor by default

    conditions: [],
    injuries: [],
    phobias: [],
    manias: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.insertOne(character);
    }
  );

  return character;
}

export async function getCharacter(
  userId: string
): Promise<CoCCharacter | null> {
  return queryCollection<CoCCharacter | null, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      return await collection.findOne({ userId });
    }
  );
}

export async function updateCharacterSkill(
  userId: string,
  skillName: string,
  value: number
): Promise<void> {
  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.updateOne(
        { userId },
        {
          $set: {
            [`skills.${skillName}`]: value,
            updatedAt: new Date(),
          },
        }
      );
    }
  );
}

export async function updateCharacterSanity(
  userId: string,
  newCurrent: number
): Promise<void> {
  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.updateOne(
        { userId },
        {
          $set: {
            "sanity.current": Math.max(0, newCurrent),
            updatedAt: new Date(),
          },
        }
      );
    }
  );
}

export async function updateCharacterLuck(
  userId: string,
  newCurrent: number
): Promise<void> {
  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.updateOne(
        { userId },
        {
          $set: {
            "luck.current": Math.max(0, newCurrent),
            updatedAt: new Date(),
          },
        }
      );
    }
  );
}

export async function addCharacterCondition(
  userId: string,
  condition: string
): Promise<void> {
  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.updateOne(
        { userId },
        {
          $addToSet: { conditions: condition },
          $set: { updatedAt: new Date() },
        }
      );
    }
  );
}

export async function removeCharacterCondition(
  userId: string,
  condition: string
): Promise<void> {
  await queryCollection<void, CoCCharacter>(
    "coc_characters",
    async (collection) => {
      await collection.updateOne(
        { userId },
        {
          $pull: { conditions: condition },
          $set: { updatedAt: new Date() },
        }
      );
    }
  );
}

export function formatCharacterSheet(character: CoCCharacter): string {
  const {
    characteristics,
    hitPoints,
    sanity,
    luck,
    magicPoints,
    movementRate,
    damageBonus,
    build,
  } = character;

  let output = `📜 **${character.name}** (${character.occupation}, Age ${character.age})\n\n`;

  // Characteristics
  output += `**Characteristics:**\n`;
  output += `STR: ${characteristics.STR} | DEX: ${characteristics.DEX} | INT: ${characteristics.INT} | CON: ${characteristics.CON}\n`;
  output += `APP: ${characteristics.APP} | POW: ${characteristics.POW} | SIZ: ${characteristics.SIZ} | EDU: ${characteristics.EDU}\n\n`;

  // Derived attributes
  output += `**Attributes:**\n`;
  output += `❤️ HP: ${hitPoints.current}/${hitPoints.maximum} | `;
  output += `🧠 Sanity: ${sanity.current}/${sanity.maximum} | `;
  output += `🍀 Luck: ${luck.current} | `;
  output += `✨ MP: ${magicPoints.current}/${magicPoints.maximum}\n`;
  output += `🏃 MOV: ${movementRate} | `;
  output += `⚔️ DB: ${damageBonus} | `;
  output += `💪 Build: ${build}\n\n`;

  // Key skills only (to avoid spam)
  const keySkills = [
    "spot hidden",
    "listen",
    "psychology",
    "library use",
    "first aid",
    "dodge",
    "fighting (brawl)",
    "firearms (handgun)",
  ];

  output += `**Key Skills:**\n`;
  keySkills.forEach((skill) => {
    if (character.skills[skill] !== undefined) {
      output += `${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${
        character.skills[skill]
      }% | `;
    }
  });
  output = output.slice(0, -3) + "\n"; // Remove last separator

  // Languages
  const languageList = Object.entries(character.languages)
    .map(([lang, value]) => `${lang}: ${value}%`)
    .join(" | ");
  if (languageList) {
    output += `\n**Languages:** ${languageList}`;
  }

  // Equipment summary
  if (character.weapons.length > 0) {
    output += `\n**Weapons:** ${character.weapons
      .map((w) => w.name)
      .join(", ")}`;
  }
  if (character.equipment.length > 0) {
    output += `\n**Equipment:** ${character.equipment.slice(0, 3).join(", ")}${
      character.equipment.length > 3 ? "..." : ""
    }`;
  }
  if (character.armor) {
    output += `\n**Armor:** ${character.armor}`;
  }

  // Backstory (show if any field has content)
  const backstoryFields = [
    { label: "Description", value: character.personalDescription },
    { label: "Beliefs", value: character.ideologyBeliefs },
    { label: "People", value: character.significantPeople },
    { label: "Locations", value: character.meaningfulLocations },
    { label: "Possessions", value: character.treasuredPossessions },
  ];

  const hasBackstory = backstoryFields.some(
    (field) => field.value && field.value.trim()
  );
  if (hasBackstory) {
    output += `\n\n**Backstory:** Use \`/character backstory\` to edit`;

    // Show a brief preview of filled fields
    const filledFields = backstoryFields
      .filter((field) => field.value && field.value.trim())
      .map((field) => field.label);

    if (filledFields.length > 0) {
      output += `\n*Completed: ${filledFields.join(", ")}*`;
    }
  } else {
    output += `\n\n*Use \`/character backstory\` to add personality details*`;
  }

  // Conditions
  if (character.conditions.length > 0) {
    output += `\n**Conditions:** ${character.conditions.join(", ")}`;
  }

  return output;
}
