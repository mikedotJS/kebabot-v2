import { type Client, type Collection, Events, type Message } from "discord.js";
import { incrementContribution } from "../features/contributions.js";
import { handleTriviaAnswer } from "../features/trivia.js";
import type { CommandModule } from "../types.js";

const PREFIX = "!";

export default {
  name: Events.MessageCreate,
  once: false as const,

  async execute(
    client: Client,
    message: Message,
    commands: Collection<string, CommandModule>
  ) {
    if (message.author.bot) return;

    await incrementContribution(message.author.id);

    await handleTriviaAnswer(message);

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = commands.get(commandName);
    if (!command || typeof command.execute !== "function") return;

    try {
      await command.execute(message, args);
    } catch (error) {
      await message.reply("There was an error executing that command.");
      console.error(error);
    }
  },
};
