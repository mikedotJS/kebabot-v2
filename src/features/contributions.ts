import { queryCollection } from "../config/db.js";
import type { TextChannel } from "discord.js";

interface ContributionDoc {
  userId: string;
  count: number;
}

export async function incrementContribution(userId: string): Promise<void> {
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
