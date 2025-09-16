interface DiceRoll {
  rolls: number[];
  total: number;
  modifier: number;
  dice: string;
  success?: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
  fumble?: boolean;
}

interface CoCResult extends DiceRoll {
  target: number;
  hardSuccess: boolean;
  extremeSuccess: boolean;
}

export class DiceRoller {
  private static rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  private static parseDiceNotation(notation: string): {
    count: number;
    sides: number;
    modifier: number;
    dropLowest?: number;
    dropHighest?: number;
    advantage?: boolean;
    disadvantage?: boolean;
  } {
    // Parse formats like: 3d6+2, 1d20, 4d6 drop lowest, 1d20 advantage
    const cleanNotation = notation.toLowerCase().replace(/\s+/g, " ").trim();

    // Check for advantage/disadvantage
    const advantage =
      cleanNotation.includes("advantage") || cleanNotation.includes("adv");
    const disadvantage =
      cleanNotation.includes("disadvantage") || cleanNotation.includes("dis");

    // Check for drop modifiers
    const dropLowestMatch = cleanNotation.match(/drop\s+lowest\s*(\d+)?/);
    const dropHighestMatch = cleanNotation.match(/drop\s+highest\s*(\d+)?/);

    // Extract core dice notation (XdY±Z)
    const diceMatch = cleanNotation.match(/(\d+)?d(\d+)([+-]\d+)?/);
    if (!diceMatch) throw new Error("Invalid dice notation");

    const count = parseInt(diceMatch[1] || "1");
    const sides = parseInt(diceMatch[2]);
    const modifier = parseInt(diceMatch[3] || "0");

    return {
      count,
      sides,
      modifier,
      dropLowest: dropLowestMatch
        ? parseInt(dropLowestMatch[1] || "1")
        : undefined,
      dropHighest: dropHighestMatch
        ? parseInt(dropHighestMatch[1] || "1")
        : undefined,
      advantage,
      disadvantage,
    };
  }

  public static rollDice(notation: string): DiceRoll {
    const parsed = this.parseDiceNotation(notation);
    let rolls: number[] = [];

    // Handle advantage/disadvantage for d20
    if (parsed.advantage || parsed.disadvantage) {
      if (parsed.sides !== 20)
        throw new Error("Advantage/disadvantage only works with d20");
      const roll1 = this.rollDie(20);
      const roll2 = this.rollDie(20);
      rolls = [roll1, roll2];

      if (parsed.advantage) {
        rolls = [Math.max(roll1, roll2)];
      } else {
        rolls = [Math.min(roll1, roll2)];
      }
    } else {
      // Normal rolling
      for (let i = 0; i < parsed.count; i++) {
        rolls.push(this.rollDie(parsed.sides));
      }

      // Handle drop modifiers
      if (parsed.dropLowest && parsed.dropLowest < rolls.length) {
        rolls.sort((a, b) => b - a); // Sort descending
        rolls = rolls.slice(0, -parsed.dropLowest);
      } else if (parsed.dropHighest && parsed.dropHighest < rolls.length) {
        rolls.sort((a, b) => a - b); // Sort ascending
        rolls = rolls.slice(0, -parsed.dropHighest);
      }
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0) + parsed.modifier;

    return {
      rolls,
      total,
      modifier: parsed.modifier,
      dice: notation,
      criticalSuccess: parsed.sides === 20 && rolls.some((r) => r === 20),
      criticalFailure: parsed.sides === 20 && rolls.some((r) => r === 1),
    };
  }

  public static rollPercentile(): number {
    return Math.floor(Math.random() * 100) + 1;
  }

  public static rollCoCSkill(target: number): CoCResult {
    const roll = this.rollPercentile();
    const success = roll <= target;
    const hardSuccess = roll <= Math.floor(target / 2);
    const extremeSuccess = roll <= Math.floor(target / 5);
    const fumble = roll >= 96 && !success;

    return {
      rolls: [roll],
      total: roll,
      modifier: 0,
      dice: "d100",
      target,
      success,
      hardSuccess,
      extremeSuccess,
      criticalSuccess: extremeSuccess,
      criticalFailure: fumble,
      fumble,
    };
  }

  public static formatRollResult(result: DiceRoll): string {
    let output = `🎲 **${result.dice}**\n`;

    if (result.rolls.length > 1) {
      output += `Rolls: [${result.rolls.join(", ")}]`;
      if (result.modifier !== 0) {
        output += ` ${result.modifier >= 0 ? "+" : ""}${result.modifier}`;
      }
      output += `\n`;
    }

    output += `**Total: ${result.total}**`;

    if (result.criticalSuccess) output += " 🎉 **CRITICAL SUCCESS!**";
    if (result.criticalFailure) output += " 💥 **CRITICAL FAILURE!**";

    return output;
  }

  public static formatCoCResult(result: CoCResult): string {
    let output = `🎲 **Call of Cthulhu Skill Check**\n`;
    output += `Target: ${result.target}% | Rolled: **${result.total}**\n\n`;

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

    return output;
  }
}
