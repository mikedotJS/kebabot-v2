import { queryCollection } from "../config/db.js";
import type { TextChannel, Client } from "discord.js";
import env from "../config/env.js";

interface ContributionDoc {
  userId: string;
  count: number;
}

export async function incrementContribution(userId: string, client?: Client): Promise<{
  leveledUp: boolean;
  newLevel: number;
  previousLevel: number;
}> {
  const previousContributions = await getContribution(userId);
  const previousLevel = calculateLevel(previousContributions);
  
  await queryCollection<void, ContributionDoc>(
    "contributions",
    async (collection) => {
      await collection.updateOne(
        { userId },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }
  );
  
  const newContributions = previousContributions + 1;
  const newLevel = calculateLevel(newContributions);
  const leveledUp = newLevel > previousLevel;
  
  if (leveledUp && client) {
    await sendLevelUpNotification(client, userId, newLevel);
  }
  
  return {
    leveledUp,
    newLevel,
    previousLevel
  };
}

async function sendLevelUpNotification(client: Client, userId: string, newLevel: number): Promise<void> {
  try {
    const channel = await client.channels.fetch(env.WEEKLY_ANNOUNCEMENTS_CHANNEL_ID) as TextChannel;
    const user = await client.users.fetch(userId);
    
    await channel.send(`🎉 **Level Up!** 🎉\n\n**${user.username}** just reached **Level ${newLevel}**! 🚀\n\nKeep up the great contributions! 💪`);
  } catch (error) {
    console.error('[Level Up] Failed to send notification:', error);
  }
}

export async function getContribution(userId: string): Promise<number> {
  return queryCollection<number, ContributionDoc>(
    "contributions",
    async (collection) => {
      const doc = await collection.findOne({ userId });
      return doc?.count ?? 0;
    }
  );
}

export function calculateLevel(contributions: number): number {
  if (contributions === 0) return 1;
  return Math.floor(Math.sqrt(contributions / 10)) + 1;
}

export function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 10;
}

export function getExpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 10;
}

export function getExpProgress(contributions: number): {
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  progressExp: number;
} {
  const level = calculateLevel(contributions);
  const currentLevelExp = getExpForLevel(level);
  const nextLevelExp = getExpForNextLevel(level);
  const progressExp = contributions - currentLevelExp;
  
  return {
    level,
    currentLevelExp,
    nextLevelExp,
    progressExp
  };
}

export async function getUserLevel(userId: string): Promise<{
  contributions: number;
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  progressExp: number;
}> {
  const contributions = await getContribution(userId);
  const expProgress = getExpProgress(contributions);
  
  return {
    contributions,
    ...expProgress
  };
}

export async function getLeaderboard(
  limit: number
): Promise<{ userId: string; count: number }[]> {
  return queryCollection<{ userId: string; count: number }[], ContributionDoc>(
    "contributions",
    async (collection) => {
      const docs = await collection
        .find()
        .sort({ count: -1 })
        .limit(limit)
        .toArray();
      return docs.map(({ userId, count }) => ({ userId, count }));
    }
  );
}

export async function displayWeeklyTopContributors(
  channel: TextChannel
): Promise<void> {
  try {
    const leaderboard = await getLeaderboard(5);

    if (leaderboard.length === 0) {
      await channel.send(
        "🏆 **Weekly Top Contributors**\n\nNo contributions this week! Be the first to start contributing!"
      );
      return;
    }

    const lines = await Promise.all(
      leaderboard.map(async ({ userId, count }, i) => {
        const user = await channel.client.users.fetch(userId);
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";
        return `${medal} **${user.username}**: ${count} contributions`;
      })
    );

    const embed = {
      color: 0x00ff00,
      title: "🏆 Weekly Top Contributors",
      description: lines.join("\n"),
      footer: {
        text: `Updated on ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      },
      timestamp: new Date().toISOString(),
    };

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(
      "[Weekly Contributors] Failed to display leaderboard:",
      error
    );
    throw error;
  }
}
